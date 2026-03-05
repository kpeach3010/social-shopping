import io
import os
from contextlib import asynccontextmanager

import httpx
import numpy as np
import torch
from diffusers.image_processor import VaeImageProcessor
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from huggingface_hub import snapshot_download
from PIL import Image

from model.cloth_masker import AutoMasker
from model.pipeline import CatVTONPipeline
from utils import init_weight_dtype, resize_and_crop, resize_and_padding

# ── Config ───────────────────────────────────────────────────────────
BASE_MODEL = os.getenv(
    "BASE_MODEL_PATH",
    "booksforcharlie/stable-diffusion-inpainting",
)
RESUME_PATH = os.getenv("RESUME_PATH", "zhengchong/CatVTON")
MIXED_PRECISION = os.getenv("MIXED_PRECISION", "bf16")
WIDTH = int(os.getenv("WIDTH", "768"))
HEIGHT = int(os.getenv("HEIGHT", "1024"))
ALLOW_TF32 = os.getenv("ALLOW_TF32", "1") == "1"

# ── Global refs (populated at startup) ───────────────────────────────
pipeline: CatVTONPipeline | None = None
automasker: AutoMasker | None = None
mask_processor: VaeImageProcessor | None = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global pipeline, automasker, mask_processor

    repo_path = snapshot_download(repo_id=RESUME_PATH)

    pipeline = CatVTONPipeline(
        base_ckpt=BASE_MODEL,
        attn_ckpt=repo_path,
        attn_ckpt_version="mix",
        weight_dtype=init_weight_dtype(MIXED_PRECISION),
        use_tf32=ALLOW_TF32,
        device="cuda",
    )
    mask_processor = VaeImageProcessor(
        vae_scale_factor=8,
        do_normalize=False,
        do_binarize=True,
        do_convert_grayscale=True,
    )
    automasker = AutoMasker(
        densepose_ckpt=os.path.join(repo_path, "DensePose"),
        schp_ckpt=os.path.join(repo_path, "SCHP"),
        device="cuda",
    )
    yield  # app is running
    # cleanup (optional)


app = FastAPI(title="CatVTON API", lifespan=lifespan)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/infer")
async def infer(
    person_image: UploadFile = File(...),
    cloth_url: str = Form(...),
    cloth_type: str = Form("upper"),
    fit_mode: str = Form("standard"),
    steps: int = Form(50),
    cfg: float = Form(2.5),
    seed: int = Form(42),
):
    # ── Validate cloth_type ──────────────────────────────────────────
    if cloth_type not in ("upper", "lower", "overall"):
        cloth_type = "upper"

    # ── Read person image from upload ────────────────────────────────
    person_bytes = await person_image.read()
    try:
        person_img = Image.open(io.BytesIO(person_bytes)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Invalid person image")

    # ── Download cloth image from URL ────────────────────────────────
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(cloth_url)
            resp.raise_for_status()
        cloth_img = Image.open(io.BytesIO(resp.content)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Cannot download cloth image from cloth_url")

    # ── Resize ───────────────────────────────────────────────────────
    person_img = resize_and_crop(person_img, (WIDTH, HEIGHT))
    cloth_img = resize_and_padding(cloth_img, (WIDTH, HEIGHT))

    # ── Auto-mask ────────────────────────────────────────────────────
    mask = automasker(person_img, cloth_type)["mask"]
    mask = mask_processor.blur(mask, blur_factor=9)

    # ── Generator ────────────────────────────────────────────────────
    generator = None
    if seed != -1:
        generator = torch.Generator(device="cuda").manual_seed(seed)

    # ── Inference ────────────────────────────────────────────────────
    result_image = pipeline(
        image=person_img,
        condition_image=cloth_img,
        mask=mask,
        num_inference_steps=steps,
        guidance_scale=cfg,
        generator=generator,
    )[0]

    # ── Return PNG ───────────────────────────────────────────────────
    buf = io.BytesIO()
    result_image.save(buf, format="PNG")
    return Response(content=buf.getvalue(), media_type="image/png")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000)

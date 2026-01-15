import { runTryOnService } from "../services/tryOn.service.js";

export const runTryOnController = async (req, res) => {
  console.log("content-type:", req.headers["content-type"]);
  console.log("body keys:", Object.keys(req.body || {}));
  console.log(
    "file:",
    req.file && {
      fieldname: req.file.fieldname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    }
  );

  try {
    if (!req.file?.buffer) {
      return res
        .status(400)
        .json({ message: "Thiếu ảnh người mẫu (field: person)" });
    }

    const {
      clothUrl,
      clothType = "upper",
      fitMode = "standard", //  mặc định standard
      steps,
      cfg,
      seed,
    } = req.body || {};

    if (!clothUrl) {
      return res.status(400).json({ message: "Thiếu clothUrl" });
    }

    const pngBuffer = await runTryOnService({
      personBuffer: req.file.buffer,
      personFilename: req.file.originalname,
      personMime: req.file.mimetype,
      clothUrl,
      clothType,
      fitMode,
      steps,
      cfg,
      seed,
    });

    res.setHeader("Content-Type", "image/png");
    return res.send(pngBuffer);
  } catch (e) {
    console.error("TryOn error:", e?.response?.data || e);
    return res.status(500).json({
      message: "Try-on failed",
      detail: e?.message,
    });
  }
};

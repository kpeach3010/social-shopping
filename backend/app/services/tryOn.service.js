import axios from "axios";
import FormData from "form-data";

const ALLOWED_TYPES = new Set(["upper", "lower", "overall"]);
const ALLOWED_FIT = new Set(["standard", "loose", "force_shape"]);

export const runTryOnService = async ({
  personBuffer,
  personFilename = "person",
  personMime = "application/octet-stream",
  clothUrl,
  clothType = "upper",
  fitMode = "standard",
  steps,
  cfg,
  seed,
}) => {
  const base = process.env.CATVTON_API_BASE;
  if (!base) throw new Error("Missing CATVTON_API_BASE in env");

  const safeType = ALLOWED_TYPES.has(clothType) ? clothType : "upper";
  const safeFit = ALLOWED_FIT.has(fitMode) ? fitMode : "standard";

  const fd = new FormData();
  fd.append("person_image", personBuffer, {
    filename: personFilename || "person",
    contentType: personMime || "application/octet-stream",
  });
  fd.append("cloth_url", clothUrl);
  fd.append("cloth_type", safeType);
  fd.append("fit_mode", safeFit);

  // optional tuning
  if (steps !== undefined) fd.append("steps", String(steps));
  if (cfg !== undefined) fd.append("cfg", String(cfg));
  if (seed !== undefined) fd.append("seed", String(seed));

  const url = base.replace(/\/$/, "") + "/infer";

  const resp = await axios.post(url, fd, {
    headers: fd.getHeaders(),
    responseType: "arraybuffer",
    timeout: 10 * 60 * 1000, // 10 phút vì infer lâu
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  return Buffer.from(resp.data);
};

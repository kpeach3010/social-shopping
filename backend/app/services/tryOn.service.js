import axios from "axios";
import FormData from "form-data";

export const runTryOnService = async ({
  personBuffer,
  personFilename = "person",
  personMime = "application/octet-stream",
  clothUrl,
  steps,
  cfg,
  seed,
}) => {
  const base = process.env.CATVTON_API_BASE;
  if (!base) throw new Error("Missing CATVTON_API_BASE in env");

  const fd = new FormData();
  fd.append("person_image", personBuffer, {
    filename: personFilename || "person",
    contentType: personMime || "application/octet-stream",
  });

  // Tải ảnh áo từ URL
  let clothBuffer = null;
  let clothFilename = "cloth.png";
  let clothMime = "image/png";

  if (clothUrl && clothUrl.startsWith("http")) {
    const fetchRes = await axios.get(clothUrl, { responseType: "arraybuffer" });
    clothBuffer = Buffer.from(fetchRes.data);

    const urlParts = clothUrl.split("/");
    const last = urlParts[urlParts.length - 1];
    if (last && last.includes(".")) clothFilename = last;

    if (fetchRes.headers["content-type"]) {
      clothMime = fetchRes.headers["content-type"];
    }
  } else {
    throw new Error("clothUrl phải là URL ảnh hợp lệ");
  }

  fd.append("cloth_image", clothBuffer, {
    filename: clothFilename,
    contentType: clothMime,
  });

  if (steps !== undefined) fd.append("steps", String(steps));
  if (cfg !== undefined) fd.append("cfg", String(cfg));
  if (seed !== undefined) fd.append("seed", String(seed));

  const url = base.replace(/\/$/, "") + "/tryon";

  // Gọi API Python
  const resp = await axios.post(url, fd, {
    headers: fd.getHeaders(),
    responseType: "arraybuffer",
    timeout: 10 * 60 * 1000,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  return Buffer.from(resp.data);
};

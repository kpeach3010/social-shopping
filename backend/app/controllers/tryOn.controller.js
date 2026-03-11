import { runTryOnService } from "../services/tryOn.service.js";

export const runTryOnController = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ message: "Thiếu ảnh người mẫu" });
    }

    const { clothUrl, steps, cfg, seed } = req.body || {};

    if (!clothUrl) {
      return res.status(400).json({ message: "Thiếu clothUrl" });
    }

    // Nhận Buffer chuẩn từ Service
    const imageBuffer = await runTryOnService({
      personBuffer: req.file.buffer,
      personFilename: req.file.originalname,
      personMime: req.file.mimetype,
      clothUrl,
      steps,
      cfg,
      seed,
    });

    // SET HEADER VÀ TRẢ THẲNG BUFFER CHO VUE
    res.setHeader("Content-Type", "image/jpeg");
    return res.send(imageBuffer);
  } catch (e) {
    console.error("TryOn error:", e?.response?.data || e);
    return res.status(500).json({
      message: "Try-on failed",
      detail: e?.message,
    });
  }
};

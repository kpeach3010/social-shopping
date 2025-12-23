import multer from "multer";

export const uploadReviewMedia = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/quicktime",
    ];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("File không được hỗ trợ"));
    }
    cb(null, true);
  },
});

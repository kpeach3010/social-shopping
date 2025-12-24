import multer from "multer";

const storage = multer.memoryStorage();

export const uploadReviewMedia = multer({
  storage,
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

export const uploadPostFiles = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
}).array("files", 8);

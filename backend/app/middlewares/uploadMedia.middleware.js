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
    fileSize: 50 * 1024 * 1024, // 50MB mỗi file
    files: 10, // Tối đa 10 file
  },
  fileFilter: (req, file, cb) => {
    // Cho phép tất cả loại file (ảnh, video, document, etc.)
    cb(null, true);
  },
}).array("files", 10); // Tăng từ 8 lên 10

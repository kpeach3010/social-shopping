import ApiError from "../api-error.js";

export const notFoundHandler = (err, req, res, next) => {
  next(new ApiError(404, "Không tìm thấy tài nguyên"));
};

export const internalHandler = (err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    message: err.message || "Lỗi máy chủ nội bộ",
  });
};

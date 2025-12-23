import {
  createReviewService,
  getReviewsByProductIdService,
  uploadReviewMediaToBucket,
} from "../services/review.service.js";

export const createReviewController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderItemId, productId, rating, comment } = req.body;

    if (!orderItemId || !productId) {
      return res.status(400).json({
        error: "Thiếu orderItemId hoặc productId",
      });
    }

    let media = [];

    if (req.files && req.files.length > 0) {
      if (req.files?.length > 5) {
        throw new Error("Chỉ được upload tối đa 5 file");
      }

      for (const file of req.files) {
        if (!file.buffer) continue;

        const uploaded = await uploadReviewMediaToBucket(
          file.buffer,
          file.mimetype,
          productId
        );

        media.push(uploaded);
      }
    }

    const review = await createReviewService(userId, {
      orderItemId,
      productId,
      rating,
      comment,
      media,
    });

    return res.status(201).json({
      message: "Đánh giá sản phẩm thành công",
      data: review,
    });
  } catch (error) {
    console.error("Error createReviewController:", error);
    return res.status(400).json({ error: error.message });
  }
};

export const getReviewsByProductIdController = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ error: "Thiếu productId" });
    }

    const reviews = await getReviewsByProductIdService(productId);

    res.status(200).json(reviews);
  } catch (error) {
    console.error("Lỗi tại getReviewsByProductIdController:", error);
    res.status(500).json({ error: "Không thể lấy danh sách đánh giá" });
  }
};

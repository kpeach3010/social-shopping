import { db } from "../db/client.js";
import {
  reviews,
  reviewMedia,
  orderItems,
  users,
  products,
} from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import supabase from "../../services/supbase/client.js";

export async function uploadReviewMediaToBucket(
  fileBuffer,
  mimetype,
  productId
) {
  const ext = mimetype.split("/")[1];
  const fileName = `${uuidv4()}.${ext}`;

  const path = `review-attachments/${productId}/${fileName}`;

  console.log(">>> Upload review media to:", path);
  console.log(
    ">>> Buffer length:",
    fileBuffer?.length,
    "isBuffer:",
    Buffer.isBuffer(fileBuffer)
  );

  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, fileBuffer, {
      upsert: true,
      contentType: mimetype,
    });

  if (error) {
    console.error("Supabase upload review media error:", error);
    throw error;
  }

  const { data: publicUrl } = supabase.storage
    .from("product-images")
    .getPublicUrl(path);

  return {
    filePath: path,
    fileUrl: publicUrl.publicUrl,
    type: mimetype.startsWith("video") ? "video" : "image",
  };
}

export const createReviewService = async (userId, data) => {
  // 1. Kiểm tra orderItem
  const [orderItem] = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.id, data.orderItemId))
    .limit(1);

  if (!orderItem) {
    throw new Error("Không tìm thấy sản phẩm trong đơn hàng");
  }

  // 2. Check đã review chưa
  const [existingReview] = await db
    .select()
    .from(reviews)
    .where(eq(reviews.orderItemId, data.orderItemId))
    .limit(1);

  if (existingReview) {
    throw new Error("Bạn đã đánh giá sản phẩm này rồi");
  }

  // 3. Transaction
  return await db.transaction(async (tx) => {
    const [review] = await tx
      .insert(reviews)
      .values({
        userId,
        productId: data.productId,
        orderItemId: data.orderItemId,
        rating: data.rating,
        comment: data.comment,
      })
      .returning();

    if (Array.isArray(data.media) && data.media.length > 0) {
      await tx.insert(reviewMedia).values(
        data.media.map((m) => ({
          reviewId: review.id,
          type: m.type,
          fileUrl: m.fileUrl,
          filePath: m.filePath,
        }))
      );
    }

    return review;
  });
};

// 2. Service lấy danh sách đánh giá theo Product ID (Public xem)
export const getReviewsByProductIdService = async (productId) => {
  // Lấy list review join với User để lấy tên người review
  const reviewsList = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      fullName: users.fullName, // Lấy tên người dùng
      variantName: orderItems.variantName, // Lấy tên phân loại hàng đã mua
    })
    .from(reviews)
    .innerJoin(orderItems, eq(reviews.orderItemId, orderItems.id))
    .innerJoin(users, eq(reviews.userId, users.id))
    .where(eq(orderItems.productId, productId)) // Lọc theo sản phẩm
    .orderBy(desc(reviews.createdAt));

  // Gắn media cho từng review
  for (const review of reviewsList) {
    const mediaItems = await db
      .select({
        type: reviewMedia.type,
        fileUrl: reviewMedia.fileUrl,
      })
      .from(reviewMedia)
      .where(eq(reviewMedia.reviewId, review.id));

    review.media = mediaItems;
  }

  return reviewsList;
};

// // 3. Helper: Tính toán và update lại Rating trung bình cho Product
// const updateProductAverageRating = async (productId) => {
//   console.log(`Đang tính lại rating cho Product ${productId}...`);

//   // Lấy tất cả review của product này
//   const list = await db
//     .select({ rating: reviews.rating })
//     .from(reviews)
//     .innerJoin(orderItems, eq(reviews.orderItemId, orderItems.id))
//     .where(eq(orderItems.productId, productId));

//   console.log(`Tổng số review tìm thấy: ${list.length}`);

//   if (list.length === 0) return;

//   // Tính trung bình cộng
//   const totalRating = list.reduce((acc, curr) => acc + curr.rating, 0);
//   const averageRating = (totalRating / list.length).toFixed(1); // Làm tròn 1 số thập phân

//   console.log(`Rating trung bình mới: ${averageRating}`);

//   // Update vào bảng Products
//   // await db
//   //   .update(products)
//   //   .set({ rating: averageRating, reviewCount: list.length })
//   //   .where(eq(products.id, productId));

//   console.log(`Đã cập nhật rating cho Product ${productId}!`);
// };

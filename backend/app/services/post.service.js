import { db } from "../db/client.js";
import { posts, postMedia, products, postProducts } from "../db/schema.js";
import { sql, eq, and, ne, asc, desc, notInArray, inArray } from "drizzle-orm";
import supabase from "../../services/supbase/client.js";

// Upload file đính kèm bài post
export async function uploadPostAttachment(
  fileBuffer,
  originalName,
  postId,
  mimeType
) {
  const safeName = `${Date.now()}-${originalName}`;
  const path = `posts/${postId}/${safeName}`;

  console.log(">>> Uploading post attachment:", path);
  console.log(
    ">>> Buffer length:",
    fileBuffer?.length,
    "isBuffer:",
    Buffer.isBuffer(fileBuffer)
  );

  const { error } = await supabase.storage
    .from("post-attachments")
    .upload(path, fileBuffer, {
      upsert: true,
      contentType: mimeType,
    });

  if (error) {
    console.error("Supabase upload error:", error);
    throw error;
  }

  const { data: publicUrl } = supabase.storage
    .from("post-attachments")
    .getPublicUrl(path);

  return {
    path,
    url: publicUrl.publicUrl,
  };
}

// Tạo bài post mới
export const createPostService = async (data) => {
  try {
    if (!data.authorId) {
      throw new Error("authorId không được để trống");
    }

    // 1) Tạo post
    const [post] = await db
      .insert(posts)
      .values({
        authorId: data.authorId,
        content: data.content,
        visibility: data.visibility || "public",
      })
      .returning();

    // 2) Upload file đính kèm
    if (Array.isArray(data.files) && data.files.length > 0) {
      for (const file of data.files) {
        const uploaded = await uploadPostAttachment(
          file.buffer,
          file.originalname,
          post.id,
          file.mimetype
        );

        const mediaType = file.mimetype.startsWith("video")
          ? "video"
          : file.mimetype.startsWith("image")
            ? "image"
            : "file";

        await db.insert(postMedia).values({
          postId: post.id,
          type: mediaType,
          postFilePath: uploaded.path,
          postFileUrl: uploaded.url,
        });
      }
    }

    // 3) Gắn sản phẩm vào post (nếu có)
    if (Array.isArray(data.productIds) && data.productIds.length > 0) {
      const rows = data.productIds.map((productId) => ({
        postId: post.id,
        productId,
      }));

      await db.insert(postProducts).values(rows);
    }

    // 4) Query lại dữ liệu
    const media = await db
      .select()
      .from(postMedia)
      .where(eq(postMedia.postId, post.id));

    const attachedProducts = await db
      .select({
        id: products.id,
        name: products.name,
        price: products.price_default,
        thumbnailUrl: products.thumbnailUrl,
      })
      .from(postProducts)
      .leftJoin(products, eq(postProducts.productId, products.id))
      .where(eq(postProducts.postId, post.id));

    return {
      post,
      media,
      products: attachedProducts,
    };
  } catch (error) {
    console.error("Error creating post:", error);
    throw error;
  }
};

// Cập nhật bài post
export const updatePostService = async (postId, authorId, data) => {
  try {
    const post = await db.select().from(posts).where(eq(posts.id, postId));

    if (!post.length) {
      throw new Error("Bài post không tồn tại");
    }

    if (post[0].authorId !== authorId) {
      throw new Error("Không có quyền sửa bài post này");
    }

    // 1) Cập nhật content/visibility
    const updates = {};
    let hasContentChange = false;

    if (data.content !== undefined) {
      updates.content = data.content;
      hasContentChange = true;
    }
    if (data.visibility !== undefined) {
      updates.visibility = data.visibility;
    }

    // Kiểm tra xem có thay đổi gì ngoài visibility không
    const hasMediaChange =
      (Array.isArray(data.deleteMediaIds) && data.deleteMediaIds.length > 0) ||
      (Array.isArray(data.files) && data.files.length > 0);
    const hasProductChange =
      (Array.isArray(data.deleteProductIds) &&
        data.deleteProductIds.length > 0) ||
      (Array.isArray(data.productIds) && data.productIds.length > 0);

    // Nếu có thay đổi ngoài visibility thì đánh dấu đã chỉnh sửa
    if (hasContentChange || hasMediaChange || hasProductChange) {
      updates.isEdited = true;
    }

    if (Object.keys(updates).length > 0) {
      await db.update(posts).set(updates).where(eq(posts.id, postId));
    }

    // 2) Xóa media cũ (nếu có)
    if (Array.isArray(data.deleteMediaIds) && data.deleteMediaIds.length > 0) {
      await db
        .delete(postMedia)
        .where(inArray(postMedia.id, data.deleteMediaIds));
    }

    // 3) Upload file mới (nếu có)
    if (Array.isArray(data.files) && data.files.length > 0) {
      for (const file of data.files) {
        const uploaded = await uploadPostAttachment(
          file.buffer,
          file.originalname,
          postId,
          file.mimetype
        );

        const mediaType = file.mimetype.startsWith("video")
          ? "video"
          : file.mimetype.startsWith("image")
            ? "image"
            : "file";

        await db.insert(postMedia).values({
          postId,
          type: mediaType,
          postFilePath: uploaded.path,
          postFileUrl: uploaded.url,
        });
      }
    }

    // 4) Cập nhật sản phẩm (nếu có)
    if (
      Array.isArray(data.deleteProductIds) &&
      data.deleteProductIds.length > 0
    ) {
      await db
        .delete(postProducts)
        .where(
          and(
            eq(postProducts.postId, postId),
            inArray(postProducts.productId, data.deleteProductIds)
          )
        );
    }

    if (Array.isArray(data.productIds) && data.productIds.length > 0) {
      const rows = data.productIds.map((productId) => ({
        postId,
        productId,
      }));
      await db.insert(postProducts).values(rows);
    }

    // 5) Query lại dữ liệu
    const media = await db
      .select()
      .from(postMedia)
      .where(eq(postMedia.postId, postId));

    const attachedProducts = await db
      .select({
        id: products.id,
        name: products.name,
        price: products.price_default,
        thumbnailUrl: products.thumbnailUrl,
      })
      .from(postProducts)
      .leftJoin(products, eq(postProducts.productId, products.id))
      .where(eq(postProducts.postId, postId));

    const updatedPost = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId));

    return {
      post: updatedPost[0],
      media,
      products: attachedProducts,
    };
  } catch (error) {
    console.error("Error updating post:", error);
    throw error;
  }
};

export const getMyPostsService = async (authorId) => {
  if (!authorId) {
    throw new Error("authorId is required");
  }

  // 1) Lấy tất cả bài post của user
  const postList = await db
    .select()
    .from(posts)
    .where(eq(posts.authorId, authorId))
    .orderBy(desc(posts.createdAt));

  if (!postList.length) return [];

  const postIds = postList.map((p) => p.id);

  // 2) Lấy media của các post
  const mediaList = await db
    .select()
    .from(postMedia)
    .where(inArray(postMedia.postId, postIds));

  // 3) Lấy product gắn với post
  const productList = await db
    .select({
      postId: postProducts.postId,
      id: products.id,
      name: products.name,
      price: products.price_default,
      thumbnailUrl: products.thumbnailUrl,
    })
    .from(postProducts)
    .leftJoin(products, eq(postProducts.productId, products.id))
    .where(inArray(postProducts.postId, postIds));

  // 4) Gom dữ liệu
  return postList.map((post) => ({
    ...post,
    media: mediaList.filter((m) => m.postId === post.id),
    products: productList.filter((p) => p.postId === post.id),
  }));
};

// Xóa bài post
export const deletePostService = async (postId, authorId) => {
  try {
    const post = await db.select().from(posts).where(eq(posts.id, postId));

    if (!post.length) {
      throw new Error("Bài post không tồn tại");
    }

    if (post[0].authorId !== authorId) {
      throw new Error("Không có quyền xóa bài post này");
    }

    // 1) Lấy tất cả media của post
    const mediaList = await db
      .select()
      .from(postMedia)
      .where(eq(postMedia.postId, postId));

    // 2) Xóa file trong storage
    if (mediaList.length > 0) {
      for (const media of mediaList) {
        try {
          await supabase.storage
            .from("post-attachments")
            .remove([media.postFilePath]);
        } catch (error) {
          console.error("Error deleting file from storage:", error);
        }
      }
    }

    // 3) Xóa media từ database
    await db.delete(postMedia).where(eq(postMedia.postId, postId));

    // 4) Xóa product associations
    await db.delete(postProducts).where(eq(postProducts.postId, postId));

    // 5) Xóa bài post
    await db.delete(posts).where(eq(posts.id, postId));

    return {
      success: true,
      message: "Xóa bài post thành công",
    };
  } catch (error) {
    console.error("Error deleting post:", error);
    throw error;
  }
};

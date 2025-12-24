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

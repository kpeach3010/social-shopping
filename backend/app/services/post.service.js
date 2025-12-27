import { db } from "../db/client.js";
import {
  posts,
  postMedia,
  products,
  postProducts,
  friendships,
  users,
  postLikes,
  postComments,
  postCommentLikes,
} from "../db/schema.js";
import {
  sql,
  eq,
  and,
  or,
  ne,
  asc,
  desc,
  notInArray,
  inArray,
} from "drizzle-orm";
import supabase from "../../services/supbase/client.js";

// Sanitize tên file: xóa ký tự đặc biệt, dấu accent
function sanitizeFileName(originalName) {
  // Xóa dấu accent (à, é, ï, etc.)
  let normalized = originalName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // Giữ lại chỉ: chữ, số, dấu gạch ngang, dấu gạch dưới, dấu chấm
  normalized = normalized.replace(/[^a-zA-Z0-9.\-_]/g, "-");

  // Xóa dấu gạch dưới/ngang liên tiếp
  normalized = normalized.replace(/[-_]+/g, "-");

  return normalized.toLowerCase();
}

// Upload file đính kèm bài post
export async function uploadPostAttachment(
  fileBuffer,
  originalName,
  postId,
  mimeType
) {
  const cleanName = sanitizeFileName(originalName);
  const safeName = `${Date.now()}-${cleanName}`;
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

    const postAuthorId = post[0].authorId;

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

// New Feed: hiển thị bài viết công khai + của bạn bè + của chính bạn
export const getNewFeedService = async (userId) => {
  if (!userId) {
    throw new Error("userId is required");
  }

  // 1) Lấy danh sách bạn bè
  const friendsRows = await db
    .select({ friendId: friendships.friendId })
    .from(friendships)
    .where(eq(friendships.userId, userId));

  const friendIds = friendsRows.map((r) => r.friendId);

  // 2) Điều kiện lọc bài viết (public | friends của bạn | của chính bạn)
  const whereClauses = [
    eq(posts.visibility, "public"),
    eq(posts.authorId, userId),
  ];
  if (friendIds.length > 0) {
    whereClauses.push(
      and(eq(posts.visibility, "friends"), inArray(posts.authorId, friendIds))
    );
  }

  const feedPosts = await db
    .select()
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(or(...whereClauses))
    .orderBy(desc(posts.createdAt));
  if (!feedPosts.length) return [];

  const postIds = feedPosts.map((p) => p.posts.id);

  // 4) Lấy media
  const mediaList = await db
    .select()
    .from(postMedia)
    .where(inArray(postMedia.postId, postIds));

  // 5) Lấy product gắn với post
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

  // 6) Gom dữ liệu
  return feedPosts.map(({ posts: post, users: author }) => ({
    ...post,
    authorName: author.fullName || author.email,
    media: mediaList.filter((m) => m.postId === post.id),
    products: productList.filter((p) => p.postId === post.id),
  }));
};

// Public Feed: chỉ lấy bài viết công khai
export const getPublicFeedService = async () => {
  // 1) Lấy bài viết visibility = public
  const publicPosts = await db
    .select()
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.visibility, "public"))
    .orderBy(desc(posts.createdAt));

  if (!publicPosts.length) return [];

  const postIds = publicPosts.map((p) => p.posts.id);

  // 2) Lấy media
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
  return publicPosts.map(({ posts: post, users: author }) => ({
    ...post,
    authorName: author.fullName || author.email,
    media: mediaList.filter((m) => m.postId === post.id),
    products: productList.filter((p) => p.postId === post.id),
  }));
};

// Lấy posts của user khác (public + friends nếu đã kết bạn)
export const getUserPostsService = async (userId, currentUserId = null) => {
  try {
    // 1) Build query điều kiện visibility
    let visibilityConditions = [eq(posts.visibility, "public")];

    // Nếu auth user là bạn của target user → thêm "friends" visibility
    if (currentUserId && currentUserId !== userId) {
      const isFriend = await db
        .select()
        .from(friendships)
        .where(
          and(
            eq(friendships.userId, currentUserId),
            eq(friendships.friendId, userId)
          )
        )
        .limit(1);

      if (isFriend.length) {
        visibilityConditions.push(eq(posts.visibility, "friends"));
      }
    }

    // 2) Lấy bài viết
    const userPosts = await db
      .select()
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(and(eq(posts.authorId, userId), or(...visibilityConditions)))
      .orderBy(desc(posts.createdAt));

    if (!userPosts.length) return [];

    const postIds = userPosts.map((p) => p.posts.id);

    // 3) Lấy media
    const mediaList = await db
      .select()
      .from(postMedia)
      .where(inArray(postMedia.postId, postIds));

    // 4) Lấy product gắn với post
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

    // 5) Gom dữ liệu
    return userPosts.map(({ posts: post, users: author }) => ({
      ...post,
      authorName: author.fullName || author.email,
      authorId: author.id,
      media: mediaList.filter((m) => m.postId === post.id),
      products: productList.filter((p) => p.postId === post.id),
    }));
  } catch (error) {
    console.error("Error getting user posts:", error);
    throw error;
  }
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

// Lấy chi tiết bài viết theo ID, kèm media, products, đếm like/comment
export const getPostByIdService = async (postId, currentUserId = null) => {
  try {
    const rows = await db
      .select({ post: posts, author: users })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.id, postId))
      .limit(1);

    if (!rows.length) throw new Error("Bài viết không tồn tại");

    const post = rows[0].post;
    const author = rows[0].author;

    // Kiểm tra quyền truy cập theo visibility
    if (post.visibility === "private") {
      if (!currentUserId || currentUserId !== post.authorId) {
        throw new Error("Bạn không có quyền xem bài viết này");
      }
    } else if (post.visibility === "friends") {
      if (!currentUserId) {
        throw new Error("Bạn không có quyền xem bài viết này");
      }
      if (currentUserId !== post.authorId) {
        const isFriend = await db
          .select()
          .from(friendships)
          .where(
            and(
              eq(friendships.userId, currentUserId),
              eq(friendships.friendId, post.authorId)
            )
          )
          .limit(1);
        if (!isFriend.length) {
          throw new Error("Chỉ bạn bè mới có thể xem bài viết này");
        }
      }
    }

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

    const [{ likeCount }] = await db
      .select({ likeCount: sql`count(*)` })
      .from(postLikes)
      .where(eq(postLikes.postId, postId));

    const [{ commentCount }] = await db
      .select({ commentCount: sql`count(*)` })
      .from(postComments)
      .where(eq(postComments.postId, postId));

    // Check user đã like post chưa
    let userHasLiked = false;
    if (currentUserId) {
      const liked = await db
        .select()
        .from(postLikes)
        .where(
          and(eq(postLikes.postId, postId), eq(postLikes.userId, currentUserId))
        )
        .limit(1);
      userHasLiked = liked.length > 0;
    }

    return {
      post: { ...post, authorName: author.fullName || author.email },
      media,
      products: attachedProducts,
      likeCount: Number(likeCount) || 0,
      commentCount: Number(commentCount) || 0,
      userHasLiked,
    };
  } catch (error) {
    console.error("Error getting post by id:", error);
    throw error;
  }
};

// Lấy danh sách bình luận của bài viết
export const getPostCommentsService = async (postId, currentUserId = null) => {
  try {
    // Xác thực quyền xem bằng cách gọi getPostByIdService
    await getPostByIdService(postId, currentUserId);

    const rows = await db
      .select({
        id: postComments.id,
        postId: postComments.postId,
        parentCommentId: postComments.parentCommentId,
        authorId: postComments.authorId,
        content: postComments.content,
        createdAt: postComments.createdAt,
        updatedAt: postComments.updatedAt,
        authorName: users.fullName,
        authorEmail: users.email,
      })
      .from(postComments)
      .innerJoin(users, eq(postComments.authorId, users.id))
      .where(eq(postComments.postId, postId))
      .orderBy(asc(postComments.createdAt));

    // Đếm like cho từng comment và check user đã like chưa
    const commentIds = rows.map((r) => r.id);
    let likeRows = [];
    let userLikes = [];

    if (commentIds.length) {
      likeRows = await db
        .select({ count: sql`count(*)`, commentId: postCommentLikes.commentId })
        .from(postCommentLikes)
        .where(inArray(postCommentLikes.commentId, commentIds))
        .groupBy(postCommentLikes.commentId);

      // Check user đã like comment nào
      if (currentUserId) {
        userLikes = await db
          .select({ commentId: postCommentLikes.commentId })
          .from(postCommentLikes)
          .where(
            and(
              inArray(postCommentLikes.commentId, commentIds),
              eq(postCommentLikes.userId, currentUserId)
            )
          );
      }
    }

    const likeMap = new Map(
      likeRows.map((l) => [l.commentId, Number(l.count) || 0])
    );
    const userLikeSet = new Set(userLikes.map((ul) => ul.commentId));

    return rows.map((r) => ({
      ...r,
      authorName: r.authorName || r.authorEmail,
      likeCount: likeMap.get(r.id) || 0,
      userHasLiked: userLikeSet.has(r.id),
    }));
  } catch (error) {
    console.error("Error getting post comments:", error);
    throw error;
  }
};

// Like bài viết
export const likePostService = async (postId, userId) => {
  try {
    // Kiểm tra bài post có tồn tại
    const post = await db.select().from(posts).where(eq(posts.id, postId));

    if (!post.length) {
      throw new Error("Bài post không tồn tại");
    }

    const postAuthorId = post[0]?.authorId;

    // Kiểm tra đã like chưa
    const existingLike = await db
      .select()
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));

    if (existingLike.length > 0) {
      throw new Error("Bạn đã like bài post này rồi");
    }

    // Tạo like
    const [like] = await db
      .insert(postLikes)
      .values({
        postId,
        userId,
      })
      .returning();

    return {
      success: true,
      data: like,
      message: "Like bài post thành công",
      postAuthorId,
    };
  } catch (error) {
    console.error("Error liking post:", error);
    throw error;
  }
};

// Lấy danh sách postId mà user đã like
export const getLikedPostIdsService = async (userId) => {
  try {
    const likedPosts = await db
      .select({ postId: postLikes.postId })
      .from(postLikes)
      .where(eq(postLikes.userId, userId));

    return likedPosts.map((row) => row.postId);
  } catch (error) {
    console.error("Error getting liked posts:", error);
    throw error;
  }
};

// Bỏ like bài viết
export const unlikePostService = async (postId, userId) => {
  try {
    // Kiểm tra like có tồn tại
    const existingLike = await db
      .select()
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));

    if (!existingLike.length) {
      throw new Error("Bạn chưa like bài post này");
    }

    // Xóa like
    await db
      .delete(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));

    return {
      success: true,
      message: "Bỏ like bài post thành công",
    };
  } catch (error) {
    console.error("Error unliking post:", error);
    throw error;
  }
};

// Bình luận bài viết
export const createCommentService = async (
  postId,
  userId,
  { content, parentCommentId = null }
) => {
  try {
    if (!content || !content.trim()) {
      throw new Error("Nội dung bình luận không được để trống");
    }

    // Kiểm tra bài post tồn tại
    const post = await db.select().from(posts).where(eq(posts.id, postId));
    if (!post.length) {
      throw new Error("Bài post không tồn tại");
    }

    // Nếu có parentCommentId, kiểm tra hợp lệ và cùng post
    let parentAuthorId = null;
    if (parentCommentId) {
      const parent = await db
        .select()
        .from(postComments)
        .where(eq(postComments.id, parentCommentId));

      if (!parent.length) {
        throw new Error("Bình luận gốc không tồn tại");
      }

      if (parent[0].postId !== postId) {
        throw new Error("Bình luận trả lời phải thuộc cùng bài viết");
      }

      parentAuthorId = parent[0].authorId;
    }

    const postAuthorId = post[0].authorId;

    const [comment] = await db
      .insert(postComments)
      .values({
        postId,
        authorId: userId,
        content: content.trim(),
        parentCommentId,
      })
      .returning();

    return {
      success: true,
      data: comment,
      postAuthorId,
      parentAuthorId,
      message: "Bình luận thành công",
    };
  } catch (error) {
    console.error("Error creating comment:", error);
    throw error;
  }
};

// Xóa bình luận bài viết (tác giả comment hoặc tác giả post)
export const deleteCommentService = async (commentId, userId) => {
  try {
    const rows = await db
      .select({
        id: postComments.id,
        authorId: postComments.authorId,
        postId: postComments.postId,
        postAuthorId: posts.authorId,
      })
      .from(postComments)
      .leftJoin(posts, eq(postComments.postId, posts.id))
      .where(eq(postComments.id, commentId));

    if (!rows.length) {
      throw new Error("Bình luận không tồn tại");
    }

    const comment = rows[0];
    const isAuthor = comment.authorId === userId;
    const isPostOwner = comment.postAuthorId === userId;

    if (!isAuthor && !isPostOwner) {
      throw new Error("Bạn không có quyền xóa bình luận này");
    }

    await db.delete(postComments).where(eq(postComments.id, commentId));

    return {
      success: true,
      message: "Xóa bình luận thành công",
    };
  } catch (error) {
    console.error("Error deleting comment:", error);
    throw error;
  }
};

// Like bình luận
export const likeCommentService = async (commentId, userId) => {
  try {
    // Kiểm tra comment tồn tại
    const comment = await db
      .select()
      .from(postComments)
      .where(eq(postComments.id, commentId));

    if (!comment.length) {
      throw new Error("Bình luận không tồn tại");
    }

    const commentAuthorId = comment[0].authorId;
    const postId = comment[0].postId;
    const commentContent = comment[0].content;

    // Lấy thông tin post để có authorId của bài viết
    const post = await db
      .select({ authorId: posts.authorId })
      .from(posts)
      .where(eq(posts.id, postId));

    const postAuthorId = post[0]?.authorId || null;

    // Kiểm tra đã like chưa
    const existing = await db
      .select()
      .from(postCommentLikes)
      .where(
        and(
          eq(postCommentLikes.commentId, commentId),
          eq(postCommentLikes.userId, userId)
        )
      );

    if (existing.length) {
      throw new Error("Bạn đã like bình luận này");
    }

    const [like] = await db
      .insert(postCommentLikes)
      .values({ commentId, userId })
      .returning();

    return {
      success: true,
      data: like,
      commentAuthorId,
      commentContent,
      postId,
      postAuthorId,
      message: "Like bình luận thành công",
    };
  } catch (error) {
    console.error("Error liking comment:", error);
    throw error;
  }
};

// Bỏ like bình luận
export const unlikeCommentService = async (commentId, userId) => {
  try {
    const existing = await db
      .select()
      .from(postCommentLikes)
      .where(
        and(
          eq(postCommentLikes.commentId, commentId),
          eq(postCommentLikes.userId, userId)
        )
      );

    if (!existing.length) {
      throw new Error("Bạn chưa like bình luận này");
    }

    await db
      .delete(postCommentLikes)
      .where(
        and(
          eq(postCommentLikes.commentId, commentId),
          eq(postCommentLikes.userId, userId)
        )
      );

    return {
      success: true,
      message: "Bỏ like bình luận thành công",
    };
  } catch (error) {
    console.error("Error unliking comment:", error);
    throw error;
  }
};

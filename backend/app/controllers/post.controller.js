import {
  createPostService,
  getMyPostsService,
  updatePostService,
  deletePostService,
  getNewFeedService,
  getPublicFeedService,
  getUserPostsService,
  likePostService,
  unlikePostService,
  createCommentService,
  deleteCommentService,
  likeCommentService,
  unlikeCommentService,
  getPostByIdService,
  getPostCommentsService,
  getLikedPostIdsService,
} from "../services/post.service.js";
import { db } from "../db/client.js";
import { createNotificationService } from "../services/notification.service.js";
import { users, posts } from "../db/schema.js";
import { eq } from "drizzle-orm";

const findUserName = async (userId) => {
  if (!userId) return "Người dùng";
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  return u?.fullName || u?.email || "Người dùng";
};

const notifyPostOwner = async ({
  postAuthorId,
  actorId,
  type,
  postId,
  title,
}) => {
  if (!postAuthorId || String(postAuthorId) === String(actorId)) return;
  try {
    const [postRow] = await db
      .select({ content: posts.content })
      .from(posts)
      .where(eq(posts.id, postId));
    const snippet = postRow?.content
      ? String(postRow.content).slice(0, 140)
      : null;

    const notification = await createNotificationService({
      userId: postAuthorId,
      type,
      title,
      content: snippet,
      relatedUserId: actorId,
      relatedEntityType: "post",
      relatedEntityId: postId,
      actionUrl: `/feed/${postAuthorId}?postId=${postId}&comments=1`,
    });

    if (global.io) {
      global.io
        .to(String(postAuthorId))
        .emit("notification:new", { notification });
    }
  } catch (e) {
    console.warn("Post notification failed:", e?.message);
  }
};

const notifyCommentAuthor = async ({
  commentAuthorId,
  actorId,
  postAuthorId,
  postId,
  content,
}) => {
  if (!commentAuthorId || String(commentAuthorId) === String(actorId)) return;
  // Tránh gửi trùng nếu đã là tác giả bài viết
  if (postAuthorId && String(commentAuthorId) === String(postAuthorId)) return;

  try {
    const actorName = await findUserName(actorId);
    const snippet = content ? String(content).slice(0, 140) : null;

    const notification = await createNotificationService({
      userId: commentAuthorId,
      type: "comment_reply",
      title: `${actorName} đã trả lời bình luận của bạn`,
      content: snippet,
      relatedUserId: actorId,
      relatedEntityType: "post",
      relatedEntityId: postId,
      actionUrl: `/feed/${postAuthorId}?postId=${postId}&comments=1`,
    });

    if (global.io) {
      global.io
        .to(String(commentAuthorId))
        .emit("notification:new", { notification });
    }
  } catch (e) {
    console.warn("Comment reply notification failed:", e?.message);
  }
};

export const createPostController = async (req, res) => {
  try {
    const { content, visibility, productIds } = req.body;

    const authorId = req.user.id;
    const files = req.files || [];

    const result = await createPostService({
      authorId,
      content,
      visibility,
      productIds: productIds ? JSON.parse(productIds) : [],
      files,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Create post error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyPostsController = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const posts = await getMyPostsService(userId);

    res.json({
      success: true,
      data: posts,
    });
  } catch (error) {
    console.error("Get my posts error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getNewFeedController = async (req, res) => {
  try {
    const userId = req.user?.id;
    const posts = userId
      ? await getNewFeedService(userId)
      : await getPublicFeedService();

    res.json({ success: true, data: posts });
  } catch (error) {
    console.error("Get new feed error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPostByIdController = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user?.id || null;
    const result = await getPostByIdService(postId, userId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Get post by id error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getPostCommentsController = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user?.id || null;
    const comments = await getPostCommentsService(postId, userId);
    res.json({ success: true, data: comments });
  } catch (error) {
    console.error("Get post comments error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// Lấy posts công khai của user khác
export const getUserPostsController = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.id;

    const posts = await getUserPostsService(userId, currentUserId);

    res.json({ success: true, data: posts });
  } catch (error) {
    console.error("Get user posts error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePostController = async (req, res) => {
  try {
    const { postId } = req.params;
    const {
      content,
      visibility,
      productIds,
      deleteMediaIds,
      deleteProductIds,
    } = req.body;

    const authorId = req.user.id;
    const files = req.files || [];

    const result = await updatePostService(postId, authorId, {
      content,
      visibility,
      productIds: productIds ? JSON.parse(productIds) : [],
      deleteMediaIds: deleteMediaIds ? JSON.parse(deleteMediaIds) : [],
      deleteProductIds: deleteProductIds ? JSON.parse(deleteProductIds) : [],
      files,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Update post error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const deletePostController = async (req, res) => {
  try {
    const { postId } = req.params;
    const authorId = req.user.id;

    const result = await deletePostService(postId, authorId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const likePostController = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await likePostService(postId, userId);

    await notifyPostOwner({
      postAuthorId: result?.postAuthorId,
      actorId: userId,
      type: "post_like",
      postId,
      title: `${await findUserName(userId)} đã thích bài viết của bạn`,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Like post error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const unlikePostController = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await unlikePostService(postId, userId);

    res.status(200).json(result);
  } catch (error) {
    console.error("Unlike post error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const createCommentController = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;
    const { content, parentCommentId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await createCommentService(postId, userId, {
      content,
      parentCommentId,
    });

    await notifyPostOwner({
      postAuthorId: result?.postAuthorId,
      actorId: userId,
      type: "post_comment",
      postId,
      title: `${await findUserName(userId)} đã bình luận bài viết của bạn`,
    });

    // Nếu là trả lời bình luận, báo cho tác giả bình luận đó (kể cả khi họ không phải chủ bài viết)
    if (result?.parentAuthorId) {
      await notifyCommentAuthor({
        commentAuthorId: result.parentAuthorId,
        actorId: userId,
        postAuthorId: result.postAuthorId,
        postId,
        content,
      });
    }

    res.status(201).json(result);
  } catch (error) {
    console.error("Create comment error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteCommentController = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await deleteCommentService(commentId, userId);

    res.status(200).json(result);
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const likeCommentController = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await likeCommentService(commentId, userId);

    // Thông báo cho chủ comment
    if (
      result?.commentAuthorId &&
      String(result.commentAuthorId) !== String(userId)
    ) {
      try {
        const actorName = await findUserName(userId);
        // Cắt nội dung bình luận để hiển thị preview (tối đa 60 ký tự)
        const commentPreview =
          result.commentContent?.length > 60
            ? result.commentContent.substring(0, 60) + "..."
            : result.commentContent || "";

        const notification = await createNotificationService({
          userId: result.commentAuthorId,
          type: "comment_like",
          title: `${actorName} đã thích bình luận của bạn`,
          content: commentPreview,
          relatedUserId: userId,
          relatedEntityType: "comment",
          relatedEntityId: commentId,
          actionUrl: result.postAuthorId
            ? `/feed/${result.postAuthorId}?postId=${result.postId}&comments=1`
            : null,
        });
        global.io
          ?.to(String(result.commentAuthorId))
          .emit("notification:new", { notification });
      } catch (e) {
        console.warn("Comment like notification failed:", e?.message);
      }
    }

    res.status(201).json(result);
  } catch (error) {
    console.error("Like comment error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const unlikeCommentController = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await unlikeCommentService(commentId, userId);

    res.status(200).json(result);
  } catch (error) {
    console.error("Unlike comment error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getLikedPostsController = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const likedPostIds = await getLikedPostIdsService(userId);

    res.json({
      success: true,
      data: likedPostIds,
    });
  } catch (error) {
    console.error("Get liked posts error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

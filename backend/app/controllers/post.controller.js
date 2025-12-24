import {
  createPostService,
  getMyPostsService,
  updatePostService,
  deletePostService,
  getNewFeedService,
  getPublicFeedService,
  getUserPostsService,
} from "../services/post.service.js";
import { db } from "../db/client.js";

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

import {
  createPostService,
  getMyPostsService,
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

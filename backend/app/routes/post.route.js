import { Router } from "express";
import * as PostController from "../controllers/post.controller.js";
import { uploadPostFiles } from "../middlewares/uploadMedia.middleware.js";
import {
  authenticate,
  optionalAuthenticate,
} from "../middlewares/auth.middleware.js";

const router = Router();

// Cho phép anonymous xem public, logged-in xem thêm bài viết bạn bè
router.get("/", optionalAuthenticate, PostController.getNewFeedController);

router.get(
  "/user/:userId",
  optionalAuthenticate,
  PostController.getUserPostsController
);

router.post(
  "/",
  authenticate,
  uploadPostFiles,
  PostController.createPostController
);

router.get("/me", authenticate, PostController.getMyPostsController);

router.delete("/:postId", authenticate, PostController.deletePostController);

router.post("/:postId/like", authenticate, PostController.likePostController);

router.get("/liked/me", authenticate, PostController.getLikedPostsController);

router.delete(
  "/:postId/like",
  authenticate,
  PostController.unlikePostController
);

router.post(
  "/:postId/comments",
  authenticate,
  PostController.createCommentController
);

router.delete(
  "/comments/:commentId",
  authenticate,
  PostController.deleteCommentController
);

router.post(
  "/comments/:commentId/like",
  authenticate,
  PostController.likeCommentController
);

router.delete(
  "/comments/:commentId/like",
  authenticate,
  PostController.unlikeCommentController
);

router.patch(
  "/:postId",
  authenticate,
  uploadPostFiles,
  PostController.updatePostController
);

// Read single post & comments
router.get(
  "/:postId",
  optionalAuthenticate,
  PostController.getPostByIdController
);
router.get(
  "/:postId/comments",
  optionalAuthenticate,
  PostController.getPostCommentsController
);

export default router;

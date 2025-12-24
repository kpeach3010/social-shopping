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

router.patch(
  "/:postId",
  authenticate,
  uploadPostFiles,
  PostController.updatePostController
);

export default router;

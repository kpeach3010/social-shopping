import { Router } from "express";
import * as PostController from "../controllers/post.controller.js";
import { uploadPostFiles } from "../middlewares/uploadMedia.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

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

// routes/review.route.js
import { Router } from "express";
import {
  createReviewController,
  getReviewsByProductIdController,
} from "../controllers/review.controller.js";
import { authenticate, hasRoles } from "../middlewares/auth.middleware.js";
import { uploadReviewMedia } from "../middlewares/uploadReviewMedia.middleware.js";
import { Role } from "../enums/role.enum.js";
import multer from "multer";

const router = Router();

router.post(
  "/",
  authenticate,
  hasRoles(Role.CUSTOMER),
  uploadReviewMedia.array("media", 5),
  createReviewController
);
router.get("/product/:productId", getReviewsByProductIdController);

export default router;

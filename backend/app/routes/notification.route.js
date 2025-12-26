import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  getNotificationsController,
  getUnreadCountController,
  markAsReadController,
  markAllAsReadController,
} from "../controllers/notification.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", getNotificationsController);
router.get("/unread-count", getUnreadCountController);
router.patch("/mark-all-read", markAllAsReadController);
router.patch("/:id/read", markAsReadController);

export default router;

import express from "express";
import multer from "multer";
import * as MessageController from "../controllers/message.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
// import { upload } from "node_modules/io/index.js";

const router = express.Router();
const upload = multer();
router.get(
  "/unread-count",
  authenticate,
  MessageController.getUnreadMessageCountController
);
router.get(
  "/:conversationId",
  authenticate,
  MessageController.getMessagesController
);
router.post(
  "/:conversationId",
  authenticate,
  upload.single("file"),
  MessageController.sendMessageController
);
router.post(
  "/mark-as-read/:conversationId",
  authenticate,
  MessageController.markConversationAsReadController
);

export default router;

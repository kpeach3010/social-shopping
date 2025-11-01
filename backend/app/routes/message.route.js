import express from "express";
import * as MessageController from "../controllers/message.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

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
  MessageController.sendMessageController
);
router.post(
  "/mark-as-read/:conversationId",
  authenticate,
  MessageController.markConversationAsReadController
);

export default router;

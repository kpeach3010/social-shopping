import express from "express";
import * as ConversationController from "../controllers/conversation.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get(
  "/",
  authenticate,
  ConversationController.getUserConversationsController
);
router.get(
  "/last-messages",
  authenticate,
  ConversationController.getLastMessagesController
);
router.get(
  "/group",
  authenticate,
  ConversationController.getUserGroupConversationsController
);
router.get(
  "/:id",
  authenticate,
  ConversationController.getConversationByIdController
);
router.post(
  "/invite-links",
  authenticate,
  ConversationController.createInviteLinkController
);
router.post(
  "/direct",
  authenticate,
  ConversationController.getOrCreateDirectConversationController
);
router.post(
  "/join/:token",
  authenticate,
  ConversationController.joinGroupOrderByInviteTokenController
);
router.get(
  "/invite-links/:token",
  ConversationController.getInviteLinkDetailController
);
// router.delete("/:conversationId", authenticate, ConversationController.deleteConversationController);

export default router;

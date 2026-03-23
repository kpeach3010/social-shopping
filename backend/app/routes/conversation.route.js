import express from "express";
import * as ConversationController from "../controllers/conversation.controller.js";
import { authenticate, hasRoles } from "../middlewares/auth.middleware.js";
import { Role } from "../enums/role.enum.js";

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
  hasRoles(Role.CUSTOMER),
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
  hasRoles(Role.CUSTOMER),
  ConversationController.joinGroupOrderByInviteTokenController
);
router.get(
  "/invite-links/:token",
  ConversationController.getInviteLinkDetailController
);
// router.delete("/:conversationId", authenticate, ConversationController.deleteConversationController);

export default router;

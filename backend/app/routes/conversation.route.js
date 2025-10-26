const express = require("express");
const {
  getOrCreateDirectConversationController,
  getMessagesController,
  sendMessageController,
  getUserGroupConversationsController,
  createInviteLinkController,
  joinGroupOrderByInviteTokenController,
  getUserConversationsController,
  getConversationByIdController,
  getInviteLinkDetailController,
  getLastMessagesController,
} = require("../controllers/conversation.controller");
const { authenticate } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", authenticate, getUserConversationsController);
router.get("/last-messages", authenticate, getLastMessagesController);
router.get("/group", authenticate, getUserGroupConversationsController);
router.get("/:id", authenticate, getConversationByIdController);
router.post("/invite-links", authenticate, createInviteLinkController);
router.post("/direct", authenticate, getOrCreateDirectConversationController);
router.post(
  "/join/:token",
  authenticate,
  joinGroupOrderByInviteTokenController
);
router.get("/invite-links/:token", getInviteLinkDetailController);
// router.delete("/:conversationId", authenticate, deleteConversationController);

module.exports = router;

const express = require("express");
const {
  getOrCreateDirectConversationController,
  getMessagesController,
  sendMessageController,
  getUserGroupConversationsController,
  createInviteLinkController,
  joinGroupOrderByInviteTokenController,
} = require("../controllers/conversation.controller");
const { authenticate } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", authenticate, getUserGroupConversationsController);
router.post("/invite-links", authenticate, createInviteLinkController);
router.post("/direct", authenticate, getOrCreateDirectConversationController);
router.get("/:conversationId/messages", authenticate, getMessagesController);
router.post("/:conversationId/messages", authenticate, sendMessageController);
router.post(
  "/join/:token",
  authenticate,
  joinGroupOrderByInviteTokenController
);
// router.delete("/:conversationId", authenticate, deleteConversationController);

module.exports = router;

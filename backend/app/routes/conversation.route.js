const express = require("express");
const {
  getOrCreateDirectConversation,
  getMessages,
  sendMessage,
} = require("../controllers/conversation.controller");
const { authenticate } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/direct", authenticate, getOrCreateDirectConversation);
router.get("/:conversationId/messages", authenticate, getMessages);
router.post("/:conversationId/messages", authenticate, sendMessage);

module.exports = router;

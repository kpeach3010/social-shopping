const express = require("express");
const {
  getMessagesController,
  sendMessageController,
  markConversationAsReadController,
  getUnreadMessageCountController,
} = require("../controllers/message.controller");
const { authenticate } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/unread-count", authenticate, getUnreadMessageCountController);
router.get("/:conversationId", authenticate, getMessagesController);
router.post("/:conversationId", authenticate, sendMessageController);
router.post(
  "/mark-as-read/:conversationId",
  authenticate,
  markConversationAsReadController
);

module.exports = router;

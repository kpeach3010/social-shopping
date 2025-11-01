import {
  getMessagesService,
  sendMessageService,
  markConversationAsReadService,
  getUnreadMessageCountService,
} from "../services/message.service.js";

export const getMessagesController = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await getMessagesService(conversationId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const sendMessageController = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, type, senderId } = req.body;
    console.log("sendMessage called:", {
      conversationId,
      senderId,
      content,
    });

    const msg = await sendMessageService(
      conversationId,
      senderId,
      content,
      type
    );
    console.log("Message saved:", msg);

    try {
      if (global.io) {
        global.io.to(conversationId).emit("conversation-updated", {
          conversationId,
          lastMessage: content,
          lastMessageAt: new Date(),
        });
      }
    } catch (socketErr) {
      console.warn("Socket emit error:", socketErr.message);
    }

    return res.json(msg);
  } catch (err) {
    console.error("sendMessageController error:", err);
    return res.status(500).json({ error: err.message });
  }
};

export const markConversationAsReadController = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const result = await markConversationAsReadService(conversationId, userId);

    // phat socker event cho cac thanh vien khac
    if (global.io) {
      global.io.to(conversationId).emit("read-update", {
        conversationId,
        userId,
        lastReadAt: result.lastReadAt,
      });
    }
    res.status(200).json({ message: "Conversation marked as read" });
  } catch (error) {
    console.error("Error marking conversation as read:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getUnreadMessageCountController = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await getUnreadMessageCountService(userId);
    return res.json({ unreadCount: count });
  } catch (err) {
    console.error("getUnreadMessageCount error:", err);
    res.status(500).json({ error: err.message });
  }
};

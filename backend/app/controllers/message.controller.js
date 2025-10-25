const {
  getMessagesService,
  sendMessageService,
  markConversationAsReadService,
} = require("../services/message.service");

exports.getMessagesController = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await getMessagesService(conversationId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.sendMessageController = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, type } = req.body;
    const msg = await sendMessageService(
      conversationId,
      req.user.id,
      content,
      type
    );
    res.json(msg);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.markConversationAsReadController = async (req, res) => {
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

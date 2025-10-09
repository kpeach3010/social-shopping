const {
  getOrCreateDirectConversationService,
  getMessagesService,
  sendMessageService,
} = require("../services/conversation.service");

exports.getOrCreateDirectConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { partnerId } = req.body;

    const conversation = await getOrCreateDirectConversationService(
      userId,
      partnerId
    );
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await getMessagesService(conversationId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.sendMessage = async (req, res) => {
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

const {
  getOrCreateDirectConversationService,
  getMessagesService,
  sendMessageService,
  getUserGroupConversationsService,
  createInviteLinkService,
  joinGroupOrderByInviteTokenService,
} = require("../services/conversation.service");

exports.getOrCreateDirectConversationController = async (req, res) => {
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

exports.getUserGroupConversationsController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.query;

    if (type !== "group") {
      return res.status(400).json({ error: "Chỉ hỗ trợ type=group" });
    }

    const conversations = await getUserGroupConversationsService(userId);
    res.json(conversations);
  } catch (err) {
    console.error("Lỗi get conversations:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.createInviteLinkController = async (req, res) => {
  try {
    const { productId, couponId } = req.body;

    const result = await createInviteLinkService({
      creatorId: req.user.id,
      productId,
      couponId,
      frontendId: process.env.FRONTEND_URL || "http://localhost:3000",
    });

    res.json(result);
  } catch (error) {
    console.error("Lỗi khi tạo link mời:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.joinGroupOrderByInviteTokenController = async (req, res) => {
  try {
    const { token } = req.params;
    const userId = req.user?.id;

    if (!token) {
      return res.status(400).json({ error: "Thiếu token" });
    }
    if (!userId) {
      return res.status(401).json({ error: "Chưa đăng nhập" });
    }

    const result = await joinGroupOrderByInviteTokenService({ token, userId });
    res.status(200).json(result);
  } catch (error) {
    console.error("Lỗi join nhóm:", error);
    res.status(400).json({ error: error.message });
  }
};

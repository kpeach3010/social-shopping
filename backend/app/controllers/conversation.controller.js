const {
  getOrCreateDirectConversationService,
  getMessagesService,
  sendMessageService,
  getUserGroupConversationsService,
  createInviteLinkService,
  joinGroupOrderByInviteTokenService,
  getUserConversationsService,
  getInviteLinkDetailService,
  getConversationByIdService,
  getLastMessagesService,
} = require("../services/conversation.service");
const { db } = require("../db/client.js");
const { users } = require("../db/schema.js");
const { eq } = require("drizzle-orm");

exports.getOrCreateDirectConversationController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { partnerId } = req.body;

    const conversation = await getOrCreateDirectConversationService(
      userId,
      partnerId
    );

    const { isNew } = conversation;
    if (isNew && global.io) {
      // Lấy thông tin của người gửi
      const [sender] = await db
        .select({
          id: users.id,
          fullName: users.fullName,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      console.log(">>>>>sender:", sender);
      // Gửi socket event (partner)
      global.io.to(partnerId).emit("new-conversation", {
        conversationId: conversation.id,
        type: "direct",
        partner: sender, // thêm thông tin người gửi
      });
    }

    res.json(conversation);
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

    return res.status(200).json(result);
  } catch (error) {
    console.error("Lỗi khi tạo link mời:", error);
    res.status(500).json({
      error: error.message,
      details: error,
    });
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

exports.getUserConversationsController = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await getUserConversationsService(userId);
    res.status(200).json(data);
  } catch (error) {
    console.error("Lỗi lấy danh sách conversation:", error);
    res.status(500).json({ message: "Không thể lấy danh sách conversation" });
  }
};

exports.getConversationByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const conversation = await getConversationByIdService(id, userId);

    if (!conversation)
      return res
        .status(404)
        .json({ message: "Không tìm thấy cuộc trò chuyện" });

    res.status(200).json(conversation);
  } catch (error) {
    console.error("getConversationByIdController error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

exports.getInviteLinkDetailController = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ message: "Thiếu token trong yêu cầu" });
    }

    const data = await getInviteLinkDetailService(token);
    return res.status(200).json(data);
  } catch (err) {
    const message = err.message || "Không thể lấy thông tin link mời";
    if (message.includes("không tồn tại"))
      return res.status(404).json({ message });
    if (message.includes("hết hạn")) return res.status(410).json({ message });
    if (message.includes("được sử dụng"))
      return res.status(409).json({ message });
    return res.status(500).json({ message });
  }
};

exports.getLastMessagesController = async (req, res) => {
  try {
    const userId = req.user.id;
    const messages = await getLastMessagesService(userId);
    res.json(messages);
  } catch (err) {
    console.error("getLastMessagesController error:", err);
    res.status(500).json({ error: err.message });
  }
};

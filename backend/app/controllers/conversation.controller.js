import {
  getOrCreateDirectConversationService,
  getUserGroupConversationsService,
  createInviteLinkService,
  joinGroupOrderByInviteTokenService,
  getUserConversationsService,
  getInviteLinkDetailService,
  getConversationByIdService,
  getLastMessagesService,
} from "../services/conversation.service.js";
import { createSystemMessage } from "../services/message.service.js";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const getOrCreateDirectConversationController = async (req, res) => {
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

      // console.log(">>>>>sender:", sender);
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

export const getUserGroupConversationsController = async (req, res) => {
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

export const createInviteLinkController = async (req, res) => {
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

export const joinGroupOrderByInviteTokenController = async (req, res) => {
  try {
    const { token } = req.params;
    const userId = req.user?.id;

    if (!token) {
      return res.status(400).json({ error: "Thiếu token" });
    }
    if (!userId) {
      return res.status(401).json({ error: "Chưa đăng nhập" });
    }

    //1) JOIN GROUP
    const result = await joinGroupOrderByInviteTokenService({ token, userId });

    const conversationId = result?.conversationId;
    const user = result?.user;

    if (!conversationId || !user) {
      return res.status(200).json(result);
    }

    //2) Tạo system message
    const content = `${user.fullName} đã tham gia nhóm.`;

    const sysMsg = await createSystemMessage(conversationId, content);

    //3) Emit realtime giống select-items
    if (global.io) {
      // Gửi system message vào khung chat
      global.io.to(conversationId).emit("message", {
        id: sysMsg.id,
        conversationId,
        content,
        type: "system",
        senderId: "00000000-0000-0000-0000-000000000000",
        createdAt: sysMsg.createdAt,
      });

      // Event riêng báo có người mới join
      global.io.to(conversationId).emit("user-joined", {
        conversationId,
        userId: user.id,
        fullName: user.fullName,
        createdAt: new Date().toISOString(),
      });

      console.log(`${user.fullName} đã tham gia nhóm ${conversationId}`);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Lỗi join nhóm:", error);
    res.status(400).json({ error: error.message });
  }
};

export const getUserConversationsController = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await getUserConversationsService(userId);
    res.status(200).json(data);
  } catch (error) {
    console.error("Lỗi lấy danh sách conversation:", error);
    res.status(500).json({ message: "Không thể lấy danh sách conversation" });
  }
};

export const getConversationByIdController = async (req, res) => {
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

export const getInviteLinkDetailController = async (req, res) => {
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

export const getLastMessagesController = async (req, res) => {
  try {
    const userId = req.user.id;
    const messages = await getLastMessagesService(userId);
    res.json(messages);
  } catch (err) {
    console.error("getLastMessagesController error:", err);
    res.status(500).json({ error: err.message });
  }
};

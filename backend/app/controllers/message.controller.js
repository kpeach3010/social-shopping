import {
  getMessagesService,
  sendMessageService,
  markConversationAsReadService,
  getUnreadMessageCountService,
} from "../services/message.service.js";
import supabase from "../../services/supbase/client.js";

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
    // console.log("sendMessage called:", {
    //   conversationId,
    //   senderId,
    //   content,
    // });
    const msg = await sendMessageService(
      conversationId,
      senderId,
      content,
      type
    );
    // console.log("Message saved:", msg);

    // Emit socket event để realtime
    if (global.io) {
      // Chuẩn hóa message cho FE
      const enrichedMsg = {
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        content: msg.content,
        type: msg.type || "text",
        createdAt: msg.createdAt,
        senderFullName:
          msg.senderFullName || msg.sender_full_name || "Người dùng",
        sender_full_name:
          msg.senderFullName || msg.sender_full_name || "Người dùng",
        sender_name: msg.senderFullName || msg.sender_full_name || "Người dùng",
      };

      // Emit cho conversation
      global.io.to(conversationId).emit("message", enrichedMsg);

      // Gửi thêm cho những thành viên chưa join phòng conversation (fallback)
      try {
        const socketsInRoom = await global.io.in(conversationId).fetchSockets();

        const connectedUserIds = new Set(
          socketsInRoom
            .map((s) =>
              String(
                s.handshake.auth?.userId ||
                  s.handshake.query?.userId ||
                  s.data?.userId ||
                  ""
              )
            )
            .filter(Boolean)
        );

        const { data: members } = await supabase
          .from("conversation_members")
          .select("user_id")
          .eq("conversation_id", conversationId);

        if (members?.length) {
          for (const member of members) {
            const uid = String(member.user_id);
            if (uid === String(senderId)) continue;
            if (connectedUserIds.has(uid)) continue; // đã ở phòng, tránh trùng
            global.io.to(uid).emit("message", enrichedMsg);
          }
        }
      } catch (fanoutErr) {
        console.warn("Fallback emit to user rooms failed", fanoutErr.message);
      }
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
      global.io.to(conversationId).emit("read-updated", {
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

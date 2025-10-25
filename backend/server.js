const app = require("./app");
const {
  startInviteLinkCleanupCron,
} = require("./app/cron/cleanupInviteLinks.js");
const config = require("./app/config");
const http = require("http");
const { Server } = require("socket.io");
const {
  createUserService,
  checkUserAdminExists,
} = require("./app/services/user.service.js");
const { default: supabase } = require("./services/supbase/client.js");

async function startServer() {
  try {
    const PORT = config.PORT || 5000;

    // Tạo server HTTP và tích hợp Socket.IO
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    global.io = io; // lưu io vào biến toàn cục để các module khác có thể sử dụng

    io.on("connection", (socket) => {
      const userId = socket.handshake.query.userId; // Lấy userId từ query parameters
      if (userId) {
        socket.join(userId); // Tham gia phòng với tên là userId
      }
      console.log(`New client connected: ${socket.id}, userId: ${userId}`);

      // join room
      socket.on("join-conversation", (conversationId) => {
        socket.join(conversationId);
        console.log(
          `Socket ${socket.id} joined conversation ${conversationId}`
        );
      });

      // gửi tin nhắn
      socket.on("send-message", async (data) => {
        const { conversationId, senderId, content, type = "text" } = data;
        // chen vao supabase
        const { data: inserted, error } = await supabase
          .from("messages")
          .insert([
            {
              conversation_id: conversationId,
              sender_id: senderId,
              content: content,
              type: type,
            },
          ])
          .select(); // lay ban ghi vua chen de emit ve client

        if (error) {
          console.error("Error inserting message:", error);
          return;
        }
        // Lấy thông tin người gửi để emit kèm fullName
        const { data: senderInfo } = await supabase
          .from("users")
          .select("id, full_name")
          .eq("id", senderId)
          .single();

        const msg = inserted[0];
        console.log("SenderInfo:", senderInfo, "Error:", error);

        const enrichedMsg = {
          ...msg,
          senderFullName: senderInfo?.full_name || "Người dùng",
        };

        io.to(conversationId).emit("message", enrichedMsg);

        // lay danh sach thanh vien cua conversation
        const { data: members } = await supabase
          .from("conversation_members")
          .select("user_id")
          .eq("conversation_id", conversationId);
        for (const member of members) {
          if (member.user_id !== senderId) {
            io.to(member.user_id).emit("message", enrichedMsg);
          }
        }
      });

      // khi user doc tin nhan
      socket.on("mark-as-read", async ({ conversationId, userId }) => {
        try {
          const now = new Date().toISOString();

          // Cập nhật hoặc tạo record mới trong message_reads
          const { error } = await supabase.from("message_reads").upsert(
            {
              user_id: userId,
              conversation_id: conversationId,
              last_read_at: now,
              updated_at: now,
            },
            { onConflict: "user_id,conversation_id" }
          );

          if (error) {
            console.error("Error updating message_reads:", error);
            return;
          }

          //  Lấy thông tin người đọc
          const { data: userRow } = await supabase
            .from("users")
            .select("id, full_name")
            .eq("id", userId)
            .single();

          //  Lấy toàn bộ thành viên khác trong conversation
          const { data: members } = await supabase
            .from("conversation_members")
            .select("user_id")
            .eq("conversation_id", conversationId);

          //  Gửi event cho từng thành viên khác (không gửi cho chính mình)
          for (const m of members) {
            if (m.user_id !== userId) {
              io.to(m.user_id).emit("read-updated", {
                conversationId,
                userId,
                fullName: userRow?.full_name || "Người dùng",
                lastReadAt: now,
              });
            }
          }

          console.log(
            `[SOCKET] User ${userId} marked as read in conversation ${conversationId}`
          );
        } catch (err) {
          console.error("mark-as-read error:", err);
        }
      });

      // trạng thái typing
      socket.on("typing", (payload) => {
        io.to(payload.conversationId).emit("typing", payload);
      });

      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
      });
    });

    // supabase realtime subscription
    supabase
      .channel("messages-changes") // tên kênh
      .on(
        "postgres_changes", //
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const newMsg = payload.new;
          // Truy vấn thông tin người gửi
          const { data: senderInfo } = await supabase
            .from("users")
            .select("id, full_name")
            .eq("id", newMsg.sender_id)
            .single();

          const enrichedMsg = {
            ...newMsg,
            senderFullName: senderInfo?.full_name || "Người dùng",
          };

          io.to(newMsg.conversation_id).emit("message", enrichedMsg);
        }
      )
      .subscribe();

    // theo doi ai vua join conversation
    supabase
      .channel("conv-members-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversation_members" },
        async (payload) => {
          const newMember = payload.new;

          // Lấy danh sách toàn bộ thành viên trong conversation
          const { data: members } = await supabase
            .from("conversation_members")
            .select("user_id")
            .eq("conversation_id", newMember.conversation_id);

          // Khi có từ 2 người trở lên, phát event group-activated
          if (members.length >= 2) {
            const { data: conversation } = await supabase
              .from("conversations")
              .select("*")
              .eq("id", newMember.conversation_id)
              .single(); // tra ve 1 object

            for (const member of members) {
              io.to(member.user_id).emit("group-activated", {
                conversationId: conversation.id,
              });
            }
          }
        }
      )
      .subscribe();

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      startInviteLinkCleanupCron();
    });

    // Kiểm tra và tạo user admin nếu chưa tồn tại
    const adminExists = await checkUserAdminExists();
    console.log("Admin user exists:", adminExists);
    if (!adminExists) {
      const adminData = {
        email: "admin@gmail.com",
        password: "admin123",
        fullName: "Admin User",
        role: "admin",
      };
      await createUserService(adminData);
    }
  } catch (error) {
    console.log("Cannot connect to the database!", error);
    process.exit();
  }
}

startServer();

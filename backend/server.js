import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { startInviteLinkCleanupCron } from "./app/cron/cleanupInviteLinks.js";
import { initCronJobs } from "./app/cron/index.js";
import config from "./app/config/index.js";
import {
  createUserService,
  checkUserAdminExists,
} from "./app/services/user.service.js";
import supabase from "./services/supbase/client.js";
import { getUnreadMessageCountService } from "./app/services/message.service.js";

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
      pingInterval: 25000, // Server ping client mỗi 25 giây
      pingTimeout: 60000, // Chờ pong từ client trong 60 giây
      connectTimeout: 45000, // Timeout khi handshake
      transports: ["websocket", "polling"],
    });

    global.io = io; // lưu io vào biến toàn cục để các module khác có thể sử dụng

    io.on("connection", (socket) => {
      const userId =
        socket.handshake.auth.userId || socket.handshake.query.userId;
      if (userId) {
        socket.join(userId); // Tham gia phòng với tên là userId
      }
      console.log(
        `[SOCKET-BE] Client connected: ${socket.id}, userId: ${userId}`
      );

      // Log ping/pong để debug
      socket.on("ping", () => {
        console.log(`[SOCKET-BE] Ping from ${socket.id}`);
      });

      socket.on("pong", () => {
        console.log(`[SOCKET-BE] Pong from ${socket.id}`);
      });

      // join room
      socket.on("join-conversation", (conversationId) => {
        // Kiểm tra đã join chưa
        const rooms = Array.from(socket.rooms);
        if (rooms.includes(conversationId)) {
          // console.log(`Socket ${socket.id} already in conversation ${conversationId}`);
          return;
        }

        socket.join(conversationId);
        console.log(
          `Socket ${socket.id} joined conversation ${conversationId}`
        );
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

          // Tính lại tổng số tin nhắn chưa đọc của user và gửi về
          const newUnreadCount = await getUnreadMessageCountService(userId);

          // Gửi tổng số unread mới cho chính user này
          io.to(userId).emit("unread-count-updated", {
            userId,
            totalUnread: newUnreadCount,
          });

          // console.log(
          //   `[SOCKET] User ${userId} marked as read in conversation ${conversationId}, new unread: ${newUnreadCount}`
          // );
        } catch (err) {
          console.error("mark-as-read error:", err);
        }
      });

      // trạng thái typing
      socket.on("typing", (payload) => {
        io.to(payload.conversationId).emit("typing", payload);
      });

      socket.on("disconnect", () => {
        console.log(
          `[SOCKET-BE] Client disconnected: ${socket.id}, userId: ${userId}`
        );
      });
    });

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      startInviteLinkCleanupCron();
      initCronJobs(io);
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

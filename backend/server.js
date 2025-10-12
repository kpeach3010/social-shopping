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

    io.on("connection", (socket) => {
      console.log("New client connected:", socket.id);

      // join room
      socket.on("join-conversation", (conversationId) => {
        socket.join(conversationId);
        console.log(
          `Socket ${socket.id} joined conversation ${conversationId}`
        );
      });

      // gửi tin nhắn
      socket.on("send-message", async (data) => {
        const { conversationId, senderId, content, type = "text " } = data;
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
        const msg = inserted[0];
        // phat cho moi nguoi trong room tru nguoi gui
        io.to(conversationId).emit("message", msg);
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
        (payload) => {
          const newMsg = payload.new;
          io.to(newMsg.conversation_id).emit("message", newMsg);
        }
      )
      .subscribe();

    // theo doi ai vua join conversation
    supabase
      .channel("conv-members-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversation_members" },
        (payload) => {
          const newMember = payload.new;
          io.to(newMember.conversation_id).emit("new-member", newMember);
        }
      );

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

import { io } from "socket.io-client";
import { useAuthStore } from "../stores/auth.js";

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();
  const auth = useAuthStore();

  const apiBase =
    config.public.apiBase ||
    (typeof window !== "undefined" && window.location.origin);

  // Lấy domain socket (bỏ phần /api/v1...)
  const socketServer = String(apiBase).replace(/\/(api.*$)/, "");

  // --- [FIX 3: Cấu hình Socket Dynamic Token] ---
  const socket = io(socketServer || "https://social-shopping.onrender.com", {
    transports: ["websocket"],
    withCredentials: true,
    autoConnect: false, // Tắt tự kết nối để kiểm soát thủ công
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    timeout: 20000,
    pingInterval: 25000, // Ping server mỗi 25s
    pingTimeout: 60000, // Timeout sau 60s không nhận pong

    // Quan trọng: Dùng hàm callback để lấy token MỚI NHẤT mỗi lần connect
    auth: (cb) => {
      const token = auth.accessToken || localStorage.getItem("accessToken");
      // Gửi cả token và userId
      cb({
        token: token,
        userId: auth.user?.id,
      });
    },
  });

  // Xử lý reconnect: Join lại các phòng đã join trước đó
  socket.on("connect", () => {
    console.log("[FE]Socket connected:", socket.id);

    // Join lại phòng userId
    if (auth.user?.id) {
      socket.emit("join-conversation", auth.user.id);
    }

    // Join lại conversation đang mở
    const activeConvId = window.__activeConversationId;
    if (activeConvId) {
      console.log("[FE]Rejoining active conversation:", activeConvId);
      socket.emit("join-conversation", activeConvId);
    }

    // Join lại tất cả conversations của user (nếu có lưu)
    const allConvIds = window.__allConversationIds || [];
    console.log("[FE]Rejoining all conversations:", allConvIds.length);
    allConvIds.forEach((convId) => {
      socket.emit("join-conversation", convId);
    });
  });

  socket.on("disconnect", (reason) => {
    console.warn("[FE]Socket disconnected:", reason);
    if (reason === "io server disconnect") {
      // Server chủ động disconnect (có thể do token hết hạn)
      // Socket sẽ không tự reconnect, cần connect lại thủ công
      console.log("[FE]Reconnecting due to server disconnect...");
      socket.connect();
    }
  });

  socket.on("reconnect", (attemptNumber) => {
    console.log("[FE]Socket reconnected after", attemptNumber, "attempts");
  });

  socket.on("reconnect_attempt", (attemptNumber) => {
    console.log("[FE]Reconnect attempt #", attemptNumber);
  });

  socket.on("reconnect_error", (error) => {
    console.error("[FE]Reconnect error:", error.message);
  });

  socket.on("reconnect_failed", () => {
    console.error("[FE]Reconnect failed completely");
  });

  socket.on("ping", () => {
    console.log("[FE]Ping sent");
  });

  socket.on("pong", (latency) => {
    console.log("[FE]Pong received, latency:", latency, "ms");
  });

  // Watch để kết nối/ngắt kết nối khi login/logout
  watchEffect(() => {
    if (auth.user?.id && auth.accessToken) {
      if (!socket.connected) {
        console.log("Connecting socket...");
        socket.connect();
      }
    } else {
      if (socket.connected) {
        console.log("Disconnecting socket...");
        socket.disconnect();
      }
    }
  });

  // Lắng nghe lỗi kết nối (Ví dụ: Token hết hạn)
  socket.on("connect_error", (err) => {
    console.error("Socket connect error:", err.message);
    // Nếu lỗi auth, socket sẽ tự chờ.
    // Bên fetchInterceptor khi refresh token xong sẽ gọi socket.connect() lại.
  });

  // Inject socket vào nuxtApp để dùng ở fetchInterceptor và các component khác
  nuxtApp.provide("socket", socket);
});

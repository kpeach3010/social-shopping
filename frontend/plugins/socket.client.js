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
  const socket = io(
    socketServer || "https://social-shopping-production.up.railway.app",
    {
      transports: ["websocket"],
      withCredentials: true,
      autoConnect: false, // Tắt tự kết nối để kiểm soát thủ công
      reconnection: true,

      // Quan trọng: Dùng hàm callback để lấy token MỚI NHẤT mỗi lần connect
      auth: (cb) => {
        const token = auth.accessToken || localStorage.getItem("accessToken");
        // Gửi cả token và userId
        cb({
          token: token,
          userId: auth.user?.id,
        });
      },
    }
  );

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

  // Các sự kiện lắng nghe khác giữ nguyên
  socket.on("new-conversation", (payload) => {
    if (typeof window !== "undefined")
      window.dispatchEvent(
        new CustomEvent("new-conversation", { detail: payload })
      );
  });

  socket.on("group-activated", (payload) => {
    if (typeof window !== "undefined")
      window.dispatchEvent(
        new CustomEvent("group-activated", { detail: payload })
      );
  });

  // Inject socket vào nuxtApp để dùng ở fetchInterceptor và các component khác
  nuxtApp.provide("socket", socket);
});

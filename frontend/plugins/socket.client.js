import { io } from "socket.io-client";
import { useAuthStore } from "../stores/auth.js";

export default defineNuxtPlugin((nuxtApp) => {
  const auth = useAuthStore();
  const socket = io("http://localhost:5000", {
    transports: ["websocket"],
    withCredentials: true,
    query: { userId: auth.user?.id },
    autoConnect: false,
  });

  watchEffect(() => {
    if (auth.user?.id) {
      socket.io.opts.query = { userId: auth.user.id };

      if (!socket.connected) {
        console.log("🔌 Connecting socket for user:", auth.user.id);
        socket.connect();
      }
    } else if (!auth.user) {
      if (socket.connected) socket.disconnect();
    }
  });

  // Khi socket reconnect tự join lại conversation đang mở
  socket.on("connect", () => {
    const activeConv = window.__activeConversationId;
    if (activeConv) {
      socket.emit("join-conversation", activeConv);
    }
  });
  // lắng nghe tin nhắn toàn cục
  socket.on("message", (msg) => {
    window.dispatchEvent(new CustomEvent("incoming-message", { detail: msg }));
  });

  socket.on("new-conversation", (payload) => {
    window.dispatchEvent(
      new CustomEvent("new-conversation", { detail: payload })
    );
  });

  socket.on("group-activated", (payload) => {
    window.dispatchEvent(
      new CustomEvent("group-activated", { detail: payload })
    );
  });

  nuxtApp.provide("socket", socket);
});

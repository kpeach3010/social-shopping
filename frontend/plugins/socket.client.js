import { io } from "socket.io-client";

export default defineNuxtPlugin((nuxtApp) => {
  const socket = io("http://localhost:5000", {
    transports: ["websocket"],
  });

  nuxtApp.provide("socket", socket);
});

import { defineStore } from "pinia";

export const useChatStore = defineStore("chat", {
  state: () => ({
    unreadCount: 0, // Tổng số tin nhắn chưa đọc
  }),

  actions: {
    setUnreadCount(count) {
      this.unreadCount = count;
      if (process.client) localStorage.setItem("unreadCount", count);
    },

    incrementUnread() {
      this.unreadCount++;
      if (process.client) localStorage.setItem("unreadCount", this.unreadCount);
    },

    clearUnread() {
      this.unreadCount = 0;
      if (process.client) localStorage.setItem("unreadCount", 0);
    },

    loadFromStorage() {
      if (process.client) {
        const saved = localStorage.getItem("unreadCount");
        if (saved) this.unreadCount = parseInt(saved);
      }
    },
  },
});

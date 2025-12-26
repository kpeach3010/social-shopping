import { defineStore } from "pinia";
import { ref } from "vue";

export const useFriendStore = defineStore("friend", () => {
  const unreadCount = ref(0);

  const setUnread = (n) => {
    const v = Math.max(0, Number(n) || 0);
    unreadCount.value = v;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("friendsUnread", String(v));
      } catch {}
    }
  };

  const incrementUnread = () => setUnread((unreadCount.value || 0) + 1);
  const decrementUnread = () =>
    setUnread(Math.max(0, (unreadCount.value || 0) - 1));
  const clearUnread = () => setUnread(0);

  return {
    unreadCount,
    setUnread,
    incrementUnread,
    decrementUnread,
    clearUnread,
  };
});

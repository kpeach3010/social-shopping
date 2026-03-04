import { defineStore } from "pinia";
import { ref } from "vue";

export const useFriendStore = defineStore("friend", () => {
  const unreadCount = ref(0);

  // Shared event for cross-component friend action sync
  // { type: 'accepted'|'rejected'|'cancelled'|'unfriended'|'request_sent', targetUserId, requestId, timestamp }
  const friendActionEvent = ref(null);

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

  /**
   * Dispatch a friend action event so other components can react.
   * @param {'accepted'|'rejected'|'cancelled'|'unfriended'|'request_sent'} type
   * @param {string} targetUserId - The other user involved
   * @param {string|null} requestId - The friend request ID (if applicable)
   */
  const dispatchFriendAction = (type, targetUserId, requestId = null) => {
    friendActionEvent.value = {
      type,
      targetUserId: String(targetUserId),
      requestId: requestId ? String(requestId) : null,
      timestamp: Date.now(),
    };
  };

  return {
    unreadCount,
    friendActionEvent,
    setUnread,
    incrementUnread,
    decrementUnread,
    clearUnread,
    dispatchFriendAction,
  };
});

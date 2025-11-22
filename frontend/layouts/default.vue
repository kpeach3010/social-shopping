<template>
  <div class="relative min-h-screen flex flex-col">
    <!-- Header -->
    <Header />

    <!-- Nội dung -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer -->
    <Footer />

    <!-- Sidebar chat (floating widget) -->
    <div
      v-if="isLoggedIn && currentUserId"
      class="fixed bottom-20 right-6 z-40"
      style="max-height: 60vh"
    >
      <ChatSidebar
        :isOpen="sidebarOpen"
        :currentUserId="currentUserId"
        :showToggle="true"
        @toggle="sidebarOpen = !sidebarOpen"
        @openChat="openChat"
      />
    </div>

    <!-- Nút mở/đóng sidebar (removed) -->

    <!-- ChatBox -->
    <ChatBox
      v-show="activePartner || activeConversation"
      v-model:conversationId="activeConversationId"
      :partner="activePartner"
      :conversation="activeConversation"
      :currentUserId="currentUserId"
      @close="closeChat"
      class="z-50"
    />
  </div>
</template>

<script setup>
import Header from "@/components/header.vue";
import Footer from "@/components/footer.vue";
import ChatSidebar from "@/components/chat/ChatSidebar.vue";
import ChatBox from "@/components/chat/ChatBox.vue";
import { useAuthStore } from "@/stores/auth";
import { useChatStore } from "@/stores/chat";
import { useWaitForAuthReady } from "@/composables/useWaitForAuthReady";

const auth = useAuthStore();
const chatStore = useChatStore();
const sidebarOpen = ref(false);

const activePartner = ref(null);
const activeConversation = ref(null);
const activeConversationId = ref(null);
const chatBoxVisible = ref(false);

const currentUserId = computed(() => auth.user?.id || "");
const isLoggedIn = computed(() => !!auth.accessToken);

watch(activeConversationId, (val) => {
  if (val) {
    window.__activeConversationId = val;
    $socket.emit("join-conversation", val);
  } else delete window.__activeConversationId;
});

function openChat(payload) {
  chatBoxVisible.value = true;
  if (payload.type === "direct") {
    activePartner.value = payload.partner;
    activeConversation.value = null;
    activeConversationId.value = null;
  } else if (payload.type === "group") {
    activePartner.value = null;
    activeConversation.value = {
      ...payload.conversation,
      type: payload.conversation?.type || "group",
    };
    activeConversationId.value = payload.conversation.id;
  }
}

function closeChat() {
  chatBoxVisible.value = false;
  activePartner.value = null;
  activeConversation.value = null;
}

const route = useRoute();
const config = useRuntimeConfig();
const { $socket } = useNuxtApp();

onMounted(async () => {
  window.addEventListener("open-group-chat", (e) => {
    const conv = e.detail;
    if (!conv) return;

    chatBoxVisible.value = true;
    activePartner.value = null;

    const conversationId = conv.id || conv.conversationId || conv.groupOrderId;
    if (!conversationId) return;

    activeConversation.value = {
      id: conversationId,
      name: conv.name || "Nhóm mua chung",
      type: conv.type || "group",
    };

    activeConversationId.value = conversationId;
  });

  if (!process.client) return;

  // chờ auth sẵn sàng, tránh reload vô hạn
  const ready = await useWaitForAuthReady();
  if (!ready || !auth.isLoggedIn) return;

  // bỏ qua nếu đang truy cập link mời nhóm
  if (route.path.startsWith("/invite/")) return;

  // window.addEventListener("open-group-chat", (e) => {
  //   const conv = e.detail;
  //   if (!conv) return;
  //   chatBoxVisible.value = true;
  //   activePartner.value = null;

  //   const conversationId = conv.id || conv.conversationId || conv.groupOrderId;
  //   if (!conversationId) return;
  //   console.log(" Nhận open-group-chat:", e.detail);

  //   activeConversation.value = {
  //     id: conversationId,
  //     name: conv.name || conv.conversationName || "Nhóm mua chung",
  //     type: conv.type || "group",
  //   };
  //   activeConversationId.value = conversationId;
  // });

  // khi có tin nhắn mới đến
  window.addEventListener("incoming-message", async (e) => {
    const msg = e.detail;
    const convId = msg.conversation_id || msg.conversationId;
    if (!convId) return;

    const hidden =
      !chatBoxVisible.value || activeConversationId.value !== convId;

    if (hidden) {
      try {
        const res = await $fetch(`/conversations/${convId}`, {
          baseURL: config.public.apiBase,
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        });

        if (res.type === "direct") {
          // Normalize sender name fields from different emitters (supabase realtime / socket)
          const senderFullName =
            msg.senderFullName || msg.sender_full_name || msg.sender_name;
          const partner = res.partner ||
            window.__users?.find(
              (u) => u.id === (msg.sender_id || msg.senderId)
            ) || {
              id: msg.sender_id || msg.senderId,
              fullName: senderFullName || "Người gửi",
            };

          activePartner.value = partner;
        } else {
          activePartner.value = null;
        }

        activeConversation.value = res;
        activeConversationId.value = convId;
        chatBoxVisible.value = true;
      } catch (err) {
        console.error("Không thể mở chatbox:", err);
      }
    }
  });

  $socket.on("message", (msg) => {
    const myId = auth.user?.id;
    const senderId = msg.sender_id ?? msg.senderId;
    if (senderId !== myId) chatStore.incrementUnread();
    window.dispatchEvent(new CustomEvent("incoming-message", { detail: msg }));
  });

  $socket.on("connect", () => {
    const convId = window.__activeConversationId;
    if (convId) $socket.emit("join-conversation", convId);
  });

  $socket.on("new-conversation", async (payload) => {
    const { conversationId, partner } = payload;
    if (!conversationId) return;
    try {
      const res = await $fetch(`/conversations/${conversationId}`, {
        baseURL: config.public.apiBase,
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      activePartner.value = partner || null;
      activeConversation.value = res;
      activeConversationId.value = res.id;
      chatBoxVisible.value = true;
    } catch (e) {
      console.error("Không thể mở chatbox mới:", e);
    }
  });

  chatStore.loadFromStorage();

  // Lấy số tin chưa đọc ban đầu
  try {
    const res = await $fetch("/messages/unread-count", {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    chatStore.setUnreadCount(res.unreadCount || 0);
  } catch (err) {
    console.error("Lỗi load unreadCount:", err);
  }

  // Khi user đọc tin (emit từ BE)
  $socket.on("unread-count-updated", ({ userId, totalUnread }) => {
    if (userId === auth.user?.id) {
      chatStore.setUnreadCount(totalUnread);
    }
  });
  onBeforeUnmount(() => {
    $socket.off("message");
    $socket.off("unread-count-updated");
    $socket.off("new-conversation");
    $socket.off("connect");
    window.removeEventListener("incoming-message", incomingHandler);
    window.removeEventListener("unread-count-updated", unreadHandler);
    window.removeEventListener("typing-message", typingHandler);
  });
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

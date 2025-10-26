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

const auth = useAuthStore();
const chatStore = useChatStore();
const sidebarOpen = ref(false);

const activePartner = ref(null);
const activeConversation = ref(null);
const activeConversationId = ref(null);
const chatBoxVisible = ref(false);

const currentUserId = computed(() => auth.user?.id || "");
const isLoggedIn = computed(() => !!auth.user);

watch(activeConversationId, (val) => {
  if (val) {
    window.__activeConversationId = val; // dùng cho reconnect auto join
  } else {
    delete window.__activeConversationId;
  }
});

function openChat(payload) {
  chatBoxVisible.value = true;

  if (payload.type === "direct") {
    activePartner.value = payload.partner;
    activeConversation.value = null;
    activeConversationId.value = null;
  } else if (payload.type === "group") {
    activePartner.value = null;
    activeConversation.value = payload.conversation;
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
//  Lắng nghe sự kiện tin nhắn toàn cục
onMounted(() => {
  // Nếu người dùng vào bằng link mời nhóm
  if (route.path.startsWith("/invite/")) {
    return;
  }

  // Khi nhận event mở chat nhóm
  window.addEventListener("open-group-chat", (e) => {
    const conv = e.detail;
    if (!conv) return;

    chatBoxVisible.value = true;
    activePartner.value = null;

    const conversationId = conv.id || conv.conversationId || conv.groupOrderId;
    if (!conversationId) return;

    activeConversation.value = {
      id: conversationId,
      name: conv.name || conv.conversationName || "Nhóm mua chung",
    };
    activeConversationId.value = conversationId;
  });

  window.addEventListener("incoming-message", async (e) => {
    const msg = e.detail;
    const convId = msg.conversation_id || msg.conversationId;
    if (!convId) return;

    // Nếu box ẩn hoặc khác cuộc hội thoại hiện tại
    const hidden =
      !chatBoxVisible.value || activeConversationId.value !== convId;
    if (hidden) {
      try {
        const res = await $fetch(`/conversations/${convId}`, {
          baseURL: config.public.apiBase,
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        });

        if (res.type === "direct") {
          const partner = res.partner ||
            window.__users?.find(
              (u) => u.id === msg.sender_id || u.id === msg.senderId
            ) || {
              id: msg.sender_id || msg.senderId,
              fullName: msg.sender_name || "Người gửi",
              name: msg.sender_name || "Người gửi",
            };

          activePartner.value = partner;
          activeConversation.value = res;
        } else {
          activePartner.value = null;
          activeConversation.value = res;
        }

        activeConversationId.value = convId;
        chatBoxVisible.value = true; // mở box
      } catch (err) {
        console.error("Không thể mở chatbox:", err);
      }
    }
  });

  // Socket message
  $socket.on("message", (msg) => {
    const myId = auth.user?.id;
    if (msg.sender_id !== myId) chatStore.incrementUnread();
    window.dispatchEvent(new CustomEvent("incoming-message", { detail: msg }));
  });

  // Khi reconnect, auto join lại conversation
  $socket.on("connect", () => {
    const convId = window.__activeConversationId;
    if (convId) {
      $socket.emit("join-conversation", convId);
    }
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
      chatBoxVisible.value = true; // mở box khi tạo mới
    } catch (e) {
      console.error("Không thể mở chatbox mới:", e);
    }
  });

  chatStore.loadFromStorage();

  // Gọi API để lấy số tin nhắn chưa đọc ban đầu
  if (auth.user?.id) {
    $fetch("/messages/unread-count", {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    })
      .then((res) => chatStore.setUnreadCount(res.unreadCount || 0))
      .catch((err) => console.error("Lỗi load unreadCount:", err));
  }

  // Khi user đọc tin (được BE emit lại)
  $socket.on("unread-count-updated", ({ userId, totalUnread }) => {
    const myId = auth.user?.id;
    if (userId === myId) {
      chatStore.setUnreadCount(totalUnread);
    }
  });
});

onBeforeUnmount(() => {
  $socket.off("message");
  $socket.off("unread-count-updated");
  $socket.off("new-conversation");
  $socket.off("connect");
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

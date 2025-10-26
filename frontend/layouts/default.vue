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
      v-if="activePartner || activeConversation"
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

const auth = useAuthStore();
const sidebarOpen = ref(false);

const activePartner = ref(null);
const activeConversation = ref(null);
const activeConversationId = ref(null);

const currentUserId = computed(() => auth.user?.id || "");
const isLoggedIn = computed(() => !!auth.user);

function openChat(payload) {
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
  activePartner.value = null;
  activeConversation.value = null;
  activeConversationId.value = null;
}

const route = useRoute();
const config = useRuntimeConfig();
const joiningGroup = ref(false);
const joinError = ref("");
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

    activePartner.value = null;

    const conversationId = conv.id || conv.conversationId || conv.groupOrderId;
    if (!conversationId) {
      console.warn(
        "Không xác định được conversationId khi mở chat nhóm:",
        conv
      );
      return;
    }

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

    // Nếu chưa mở khung chat này
    if (activeConversationId.value !== convId) {
      try {
        // Gọi API lấy thông tin conversation để mở đúng box
        const res = await $fetch(`/conversations/${convId}`, {
          baseURL: config.public.apiBase,
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        });
        if (res.type === "direct") {
          let partner = res.partner ||
            window.__users?.find(
              (u) => u.id === msg.sender_id || u.id === msg.senderId
            ) || {
              id: msg.sender_id || msg.senderId,
              fullName: msg.sender_name || "Người gửi",
              name: msg.sender_name || "Người gửi",
            };

          activePartner.value = partner;
          activeConversation.value = res;
        } else if (res.type === "group") {
          activePartner.value = null;
          activeConversation.value = res;
        }

        activeConversationId.value = convId;
        activeConversation.value = res;
      } catch (err) {
        console.error("Không thể mở chatbox:", err);
      }
    }
  });

  // Lắng nghe tin nhắn realtime
  $socket.on("message", (msg) => {
    window.dispatchEvent(new CustomEvent("incoming-message", { detail: msg }));
  });

  //  Lắng nghe khi server thông báo có conversation mới
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

      // Cuộn xuống cuối khi chatbox mở ra
      nextTick(() => {
        const chatEl = document.querySelector(".chatbox-scroll");
        if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;
      });
    } catch (e) {
      console.error("Không thể mở chatbox mới:", e);
    }
  });

  auth.loadFromStorage();
});

// async function handleJoinGroup() {
//   const token = route.params?.token || route.path.split("/invite/")[1];
//   if (!token) return;
//   if (!auth.accessToken) {
//     alert("Bạn cần đăng nhập để tham gia nhóm");
//     return;
//   }

//   joiningGroup.value = true;
//   try {
//     const res = await $fetch(`/conversations/join/${token}`, {
//       method: "POST",
//       baseURL: config.public.apiBase,
//       headers: { Authorization: `Bearer ${auth.accessToken}` },
//     });
//     activePartner.value = null;
//     activeConversation.value = res;
//     activeConversationId.value = res.conversationId;
//   } catch (e) {
//     alert(e?.data?.message || e.message || "Không thể tham gia nhóm");
//   } finally {
//     joiningGroup.value = false;
//   }
// }
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

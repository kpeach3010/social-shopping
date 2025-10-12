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

// Tự động nhận diện /invite/[token] và join group
const route = useRoute();
const config = useRuntimeConfig();
const joiningGroup = ref(false);
const joinError = ref("");

onMounted(async () => {
  if (route.path.startsWith("/invite/")) {
    const token = route.params?.token || route.path.split("/invite/")[1];
    if (!token) return;
    if (!auth.accessToken) {
      joinError.value = "Bạn cần đăng nhập để tham gia nhóm";
      alert(joinError.value);
      return;
    }
    joiningGroup.value = true;
    joinError.value = "";
    try {
      const res = await $fetch("/conversations/join", {
        method: "POST",
        baseURL: config.public.apiBase,
        headers: { Authorization: `Bearer ${auth.accessToken}` },
        body: { invitelink: token },
      });
      // Mở chatbox group
      activePartner.value = null;
      activeConversation.value = res.conversation;
      activeConversationId.value = res.conversation.id;
      // Chuyển về trang chủ hoặc sản phẩm sau khi join (nếu muốn)
      // navigateTo("/");
    } catch (e) {
      joinError.value =
        e?.data?.message || e.message || "Không thể tham gia nhóm";
      alert(joinError.value);
    } finally {
      joiningGroup.value = false;
    }
  }
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

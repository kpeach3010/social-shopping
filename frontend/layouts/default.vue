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
      v-if="activePartner"
      v-model:conversationId="activeConversationId"
      :partner="activePartner"
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
const activeConversationId = ref(null);

const currentUserId = computed(() => auth.user?.id || "");
const isLoggedIn = computed(() => !!auth.user);

function openChat(user) {
  activePartner.value = user;
  activeConversationId.value = null;
}
function closeChat() {
  activePartner.value = null;
  activeConversationId.value = null;
}
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

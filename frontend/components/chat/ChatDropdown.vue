<template>
  <div class="relative">
    <!-- Nút icon chat -->
    <button v-if="auth.isLoggedIn" @click="toggleDropdown" class="relative">
      <ChatBubbleOvalLeftIcon class="w-6 h-6 text-gray-700 hover:text-black" />

      <span
        v-if="chatStore.unreadCount > 0"
        class="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full px-1.5 py-0.5"
      >
        {{ chatStore.unreadCount }}
      </span>
    </button>
    <!-- Dropdown hội thoại -->
    <transition name="fade-slide">
      <div
        v-show="dropdownOpen"
        class="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
      >
        <div class="max-h-96 overflow-y-auto">
          <div
            v-for="conv in conversations"
            :key="conv.conversationId"
            @click="openChat(conv)"
            class="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
            :class="
              conv.isUnread ? 'font-semibold text-gray-900' : 'text-gray-700'
            "
          >
            <div class="relative flex-shrink-0">
              <component
                :is="conv.type === 'group' ? UserGroupIcon : UserCircleIcon"
                class="w-8 h-8 text-gray-400"
              />
              <span
                v-if="conv.isUnread"
                class="absolute -top-0.5 -left-0.5 h-3 w-3 bg-blue-500 rounded-full border border-white"
              ></span>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex justify-between">
                <span class="truncate text-sm">
                  {{ conv.type === "group" ? conv.convName : conv.partnerName }}
                </span>

                <span class="text-xs text-gray-400">
                  {{ formatTime(conv.createdAt) }}
                </span>
              </div>
              <div class="truncate text-sm text-gray-600">
                {{ conv.lastMessage }}
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="conversations.length === 0"
          class="p-4 text-center text-gray-400 text-sm"
        >
          Không có cuộc trò chuyện nào
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useAuthStore } from "~/stores/auth";
import { useChatStore } from "~/stores/chat";
import {
  ChatBubbleOvalLeftIcon,
  UserCircleIcon,
  UserGroupIcon,
} from "@heroicons/vue/24/outline";

const auth = useAuthStore();
const chatStore = useChatStore();
const config = useRuntimeConfig();
const { $socket } = useNuxtApp();
const dropdownOpen = ref(false);
const conversations = ref([]);

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value;
  if (dropdownOpen.value) {
    fetchConversations();
  }
}

function formatTime(t) {
  const date = new Date(t);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins}p`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return "Hôm qua";

  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function fetchConversations() {
  try {
    const data = await $fetch("/conversations/last-messages", {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    conversations.value = data;
  } catch (err) {
    console.error("Lỗi tải danh sách hội thoại:", err);
  }
}

function openChat(conv) {
  dropdownOpen.value = false;

  const isGroup = conv.type === "group";

  window.dispatchEvent(
    new CustomEvent("open-group-chat", {
      detail: {
        conversationId: conv.conversationId,
        name: isGroup ? conv.convName : conv.partnerName,
        type: isGroup ? "group" : "direct",
        partner: !isGroup
          ? {
              id: conv.partnerId,
              fullName: conv.partnerName,
            }
          : null,
      },
    })
  );
}

onMounted(() => {
  const __markAsReadHandler = (e) => {
    if (!auth.user) return;
    const convId = e?.detail?.conversationId;
    const idx = conversations.value.findIndex(
      (c) => c.conversationId === convId
    );
    if (idx !== -1) {
      // Xóa chấm xanh
      conversations.value[idx].senderId = auth.user.id;
    }
  };

  // Lắng nghe tin nhắn mới để cập nhật dropdown realtime
  $socket.on("message", (raw) => {
    const convId = raw.conversationId || raw.conversation_id;
    const idx = conversations.value.findIndex(
      (c) => c.conversationId === convId
    );

    if (idx !== -1) {
      // Cập nhật last message và timestamp
      conversations.value[idx].lastMessage = raw.content || "[Tệp đính kèm]";
      conversations.value[idx].createdAt = new Date().toISOString();
      conversations.value[idx].senderId = raw.senderId || raw.sender_id;
      conversations.value[idx].isUnread = raw.senderId !== auth.user.id;

      // Đưa conversation này lên đầu danh sách
      const conv = conversations.value.splice(idx, 1)[0];
      conversations.value.unshift(conv);
    } else if (dropdownOpen.value) {
      // Nếu conversation chưa có trong list -> fetch lại danh sách
      fetchConversations();
    }
  });

  window.addEventListener("mark-as-read", __markAsReadHandler);

  onBeforeUnmount(() => {
    window.removeEventListener("mark-as-read", __markAsReadHandler);
    $socket.off("message");
  });
});
</script>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>

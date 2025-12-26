<template>
  <div class="relative">
    <button
      @click="toggleDropdown"
      class="relative flex items-center text-gray-700 hover:text-black focus:outline-none"
    >
      <BellIcon class="w-6 h-6" />
      <span
        v-if="unreadCount > 0"
        class="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-semibold rounded-full min-w-4 h-4 flex items-center justify-center"
      >
        {{ unreadCount }}
      </span>
    </button>

    <transition name="fade-slide">
      <div
        v-show="open"
        class="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
      >
        <div class="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 class="font-semibold text-gray-900 text-sm">Thông báo</h3>
        </div>

        <div class="max-h-96 overflow-y-auto">
          <div
            v-for="n in notifications"
            :key="n.id"
            class="px-4 py-3 border-b border-gray-100 hover:bg-gray-50"
          >
            <p class="text-sm text-gray-900">{{ n.title }}</p>
            <p class="text-xs text-gray-500 mt-0.5">
              {{ formatTime(n.createdAt) }}
            </p>
          </div>

          <div
            v-if="!loading && notifications.length === 0"
            class="p-6 text-center text-gray-400 text-sm"
          >
            <BellIcon class="w-8 h-8 mx-auto mb-2 text-gray-300" />
            Không có thông báo nào
          </div>

          <div v-if="loading" class="p-6 text-center">
            <div
              class="animate-spin rounded-full h-6 w-6 border-b-2 border-black mx-auto"
            ></div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { BellIcon } from "@heroicons/vue/24/outline";
import { useAuthStore } from "~/stores/auth";

const auth = useAuthStore();
const config = useRuntimeConfig();
const { $socket } = useNuxtApp();

const open = ref(false);
const notifications = ref([]);
const unreadCount = ref(0);
const loading = ref(false);

async function toggleDropdown() {
  open.value = !open.value;
  if (open.value) {
    // Đánh dấu tất cả thông báo là đã đọc vĩnh viễn
    unreadCount.value = 0;
    try {
      await $fetch("/notifications/mark-all-read", {
        method: "PATCH",
        baseURL: config.public.apiBase,
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
    } catch (e) {
      console.warn("Failed to mark all as read:", e);
    }
    if (notifications.value.length === 0) {
      fetchNotifications();
    }
  }
}

function formatTime(iso) {
  if (!iso) return "";
  try {
    const date = new Date(iso);
    const sec = Math.floor((new Date() - date) / 1000);
    if (sec < 60) return "Vừa xong";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}p`;
    const hour = Math.floor(min / 60);
    if (hour < 24) return `${hour}h`;
    return `${Math.floor(hour / 24)}d`;
  } catch {
    return "";
  }
}

async function fetchNotifications() {
  if (!auth.isLoggedIn) return;
  loading.value = true;
  try {
    const res = await $fetch("/notifications", {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    const list = res?.data || res || [];
    // Chỉ hiển thị thông báo không phải friend_request (friend_request chỉ ở FriendsDropdown)
    notifications.value = list.filter((n) => n.type !== "friend_request");

    const countRes = await $fetch("/notifications/unread-count", {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    unreadCount.value = countRes?.data?.count ?? 0;
  } catch (err) {
    console.error("Lỗi tải thông báo:", err);
    notifications.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (!auth.isLoggedIn) return;
  // Lấy count ban đầu nhanh nếu cần
  fetchInitialUnread();

  if ($socket) {
    $socket.on("notification:new", (payload) => {
      const notif = payload?.notification;
      // Chỉ tăng badge nếu dropdown chưa mở (không phải friend_request)
      if (notif && notif.type !== "friend_request" && !open.value) {
        unreadCount.value = (unreadCount.value || 0) + 1;
      }
      // Thêm vào danh sách nếu dropdown đang mở
      if (open.value && notif && notif.type !== "friend_request") {
        notifications.value.unshift(notif);
      }
    });
  }
});

onBeforeUnmount(() => {
  if ($socket) {
    $socket.off("notification:new");
  }
});

async function fetchInitialUnread() {
  try {
    const r = await $fetch("/notifications/unread-count", {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    unreadCount.value = r?.data?.count ?? 0;
  } catch {}
}
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

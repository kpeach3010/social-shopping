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
          <button
            v-for="n in notifications"
            :key="n.id"
            :class="[
              'w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 relative',
              !n.isRead ? 'bg-blue-50' : '',
            ]"
            @click="handleNotificationClick(n)"
          >
            <div class="flex items-start gap-2">
              <div
                v-if="!n.isRead"
                class="w-2 h-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"
              ></div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-gray-900">{{ n.title }}</p>
                <p
                  v-if="n.content"
                  class="text-xs text-gray-600 mt-0.5 line-clamp-2"
                >
                  {{ n.content }}
                </p>
                <p class="text-xs text-gray-500 mt-0.5">
                  {{ formatTime(n.createdAt) }}
                </p>
              </div>
            </div>
          </button>

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
import { useRouter } from "vue-router";

const auth = useAuthStore();
const config = useRuntimeConfig();
const { $socket } = useNuxtApp();
const router = useRouter();

const open = ref(false);
const notifications = ref([]);
const unreadCount = ref(0);
const loading = ref(false);

// Helper: gọi API với auth header
const api = (url, opts = {}) =>
  $fetch(url, {
    baseURL: config.public.apiBase,
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    ...opts,
  });

// Format thời gian ngắn gọn
const formatTime = (iso) => {
  if (!iso) return "";
  try {
    const sec = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (sec < 60) return "Vừa xong";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}p`;
    const h = Math.floor(min / 60);
    return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
  } catch {
    return "";
  }
};

// Fetch danh sách thông báo và count
const fetchNotifications = async () => {
  if (!auth.isLoggedIn) return;
  loading.value = true;
  try {
    const [list, count] = await Promise.all([
      api("/notifications"),
      api("/notifications/unread-count"),
    ]);
    notifications.value = (list?.data || list || []).filter(
      (n) => n.type !== "friend_request"
    );
    unreadCount.value = count?.data?.count ?? 0;
  } catch (err) {
    console.error("Lỗi tải thông báo:", err);
  } finally {
    loading.value = false;
  }
};

// Toggle dropdown (không auto mark-read toàn bộ)
const toggleDropdown = async () => {
  open.value = !open.value;
  if (!open.value) return;

  await fetchNotifications();
};

// Click vào thông báo: mark read + navigate
const handleNotificationClick = async (n) => {
  if (!n) return;
  if (n.id && !n.isRead) {
    n.isRead = true;
    if (unreadCount.value > 0) unreadCount.value -= 1;
    api(`/notifications/${n.id}/read`, { method: "PATCH" }).catch(() => {});
  }
  // Phát sự kiện để trang khác mở modal thay vì điều hướng
  window.dispatchEvent(new CustomEvent("notification-open", { detail: n }));
  open.value = false;
};

onMounted(() => {
  if (!auth.isLoggedIn) return;

  // Fetch count ban đầu
  api("/notifications/unread-count")
    .then((r) => (unreadCount.value = r?.data?.count ?? 0))
    .catch(() => {});

  // Socket listener cho thông báo mới
  $socket?.on("notification:new", ({ notification: n }) => {
    if (n?.type === "friend_request") return;
    const incoming = { ...n, isRead: false };
    unreadCount.value++;
    if (open.value) notifications.value.unshift(incoming);
  });
});

onBeforeUnmount(() => $socket?.off("notification:new"));
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

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
        class="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
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
              <img
                v-if="n.imageUrl"
                :src="n.imageUrl"
                class="w-10 h-10 rounded object-cover border flex-shrink-0 mt-0.5"
              />
              <div
                v-else-if="!n.isRead"
                class="w-2 h-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"
              ></div>
              <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start">
                  <p class="text-sm text-gray-900 pr-2">{{ n.title }}</p>
                  <span
                    class="text-[10px] text-gray-400 whitespace-nowrap pt-0.5"
                  >
                    {{ formatTime(n.createdAt) }}
                  </span>
                </div>
                <p v-if="n.content" class="text-xs text-gray-600 mt-0.5">
                  {{ n.content }}
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
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { BellIcon } from "@heroicons/vue/24/outline";
import { useAuthStore } from "~/stores/auth";
import { useRouter } from "vue-router";

const props = defineProps({
  open: { type: Boolean, default: false },
});
const emit = defineEmits(["toggle"]);

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
const formatTime = (t) => {
  if (!t) return "";
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
      (n) => n.type !== "friend_request",
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
  emit("toggle");
};

// Click vào thông báo: mark read + chỉ mở modal nếu là tương tác bài viết
const handleNotificationClick = async (n) => {
  if (!n) return;
  if (n.id && !n.isRead) {
    n.isRead = true;
    if (unreadCount.value > 0) unreadCount.value -= 1;
    api(`/notifications/${n.id}/read`, { method: "PATCH" }).catch(() => {});
  }

  // Nếu là thông báo tương tác bài viết (like, comment, reply, comment_like, post_like, post_comment)
  const postInteractionTypes = [
    "post_like",
    "post_comment",
    "comment_reply",
    "comment_like",
  ];
  if (postInteractionTypes.includes(n.type) && n.relatedEntityId) {
    // Phát sự kiện để trang hiện tại mở modal bình luận bài viết
    window.dispatchEvent(
      new CustomEvent("notification-open", {
        detail: {
          ...n,
          modal: "comments",
          postId: n.relatedEntityId,
        },
      }),
    );
    open.value = false;
    return;
  }
  
  // Nếu là thông báo về tồn kho nhóm mua chung
  if (['group_stock_warning', 'group_stock_recovered'].includes(n.type) && n.actionUrl) {
    try {
      // actionUrl có dạng /conversation/[id]
      const parts = n.actionUrl.split('/');
      const conversationId = parts[parts.length - 1];
      
      if (conversationId) {
        window.dispatchEvent(
          new CustomEvent("open-group-chat", {
            detail: {
              id: conversationId,
              // Lấy tên nhóm từ title có dạng "[Tên nhóm] ..."
              name: n.title?.match(/\[(.*?)\]/)?.[1] || "Nhóm mua chung",
              type: 'group'
            },
          }),
        );
        open.value = false;
        return;
      }
    } catch (err) {
      console.error("Lỗi xử lý click thông báo nhóm:", err);
    }
  }

  // Các loại thông báo khác vẫn điều hướng nếu có actionUrl
  if (n.actionUrl) {
    router.push(n.actionUrl);
  }
  open.value = false;
};

onMounted(() => {
  if (!auth.isLoggedIn) return;

  open.value = props.open;

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

watch(
  () => props.open,
  async (v) => {
    open.value = v;
    if (v) {
      await fetchNotifications();
      // Khi người dùng mở dropdown, đánh dấu tất cả thông báo là đã đọc
      try {
        await api("/notifications/mark-all-read", { method: "PATCH" });
        notifications.value = notifications.value.map((n) => ({
          ...n,
          isRead: true,
        }));
        unreadCount.value = 0;
      } catch (e) {
        console.error("Lỗi mark all notifications as read:", e);
      }
    }
  },
);
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

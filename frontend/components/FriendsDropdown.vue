<template>
  <div class="relative">
    <!-- Nút icon kết bạn -->
    <button @click="toggleDropdown" class="relative">
      <UsersIcon class="w-6 h-6 text-gray-700 hover:text-black" />

      <span
        v-if="friendStore.unreadCount > 0"
        class="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full px-1.5 py-0.5"
      >
        {{ friendStore.unreadCount }}
      </span>
    </button>

    <!-- Dropdown thông báo kết bạn -->
    <transition name="fade-slide">
      <div
        v-show="dropdownOpen"
        class="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
      >
        <div class="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 class="font-semibold text-gray-900 text-sm">Lời mời kết bạn</h3>
        </div>

        <div class="max-h-96 overflow-y-auto">
          <!-- Danh sách yêu cầu kết bạn -->
          <div
            v-for="request in friendRequests"
            :key="request.id"
            class="flex items-start gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50"
          >
            <!-- Avatar -->
            <div class="shrink-0">
              <div
                class="w-10 h-10 rounded-full bg-white border border-gray-300 flex items-center justify-center"
              >
                <span class="text-gray-700 text-sm font-bold">
                  {{ getInitial(request.senderName) }}
                </span>
              </div>
            </div>

            <!-- Thông tin -->
            <div class="flex-1 min-w-0">
              <NuxtLink
                :to="`/feed/${request.senderId}`"
                class="font-semibold text-sm text-gray-900 hover:text-gray-700 truncate block"
              >
                {{ request.senderName }}
              </NuxtLink>
              <p class="text-xs text-gray-500 mt-0.5">
                {{ formatTime(request.createdAt) }}
              </p>
            </div>

            <!-- Actions -->
            <div class="flex gap-2 shrink-0">
              <button
                @click="acceptRequest(request)"
                :disabled="processingId === request.id"
                class="p-1.5 rounded-full bg-black text-white hover:bg-gray-800 disabled:opacity-60 transition"
                title="Chấp nhận"
              >
                <CheckIcon class="w-4 h-4" />
              </button>
              <button
                @click="rejectRequest(request)"
                :disabled="processingId === request.id"
                class="p-1.5 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-60 transition"
                title="Từ chối"
              >
                <XMarkIcon class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Empty state -->
          <div
            v-if="friendRequests.length === 0 && !loading"
            class="p-6 text-center text-gray-400 text-sm"
          >
            <UsersIcon class="w-8 h-8 mx-auto mb-2 text-gray-300" />
            Không có yêu cầu kết bạn nào
          </div>

          <!-- Loading state -->
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
import { useAuthStore } from "~/stores/auth";
import { useFriendStore } from "~/stores/friend";
import { UsersIcon, CheckIcon, XMarkIcon } from "@heroicons/vue/24/outline";

const auth = useAuthStore();
const friendStore = useFriendStore();
const config = useRuntimeConfig();
const { $socket } = useNuxtApp();

const dropdownOpen = ref(false);
const friendRequests = ref([]);
const loading = ref(false);
const processingId = ref(null);

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value;
  if (dropdownOpen.value && friendRequests.value.length === 0) {
    fetchPendingRequests();
  }
}

function getInitial(name = "?") {
  return (name?.trim()?.charAt(0) || "?").toUpperCase();
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

async function fetchPendingRequests() {
  if (!auth.isLoggedIn) return;

  loading.value = true;
  try {
    const res = await $fetch("/friends/requests/pending", {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    const list = res?.data || res || [];
    // Enriched với thông tin sender
    friendRequests.value = list.map((req) => ({
      ...req,
      senderName:
        req.senderName ||
        req.sender?.fullName ||
        req.sender?.email ||
        "Người dùng",
    }));

    friendStore.setUnread(list.length);
  } catch (err) {
    console.error("Lỗi tải yêu cầu kết bạn:", err);
    friendRequests.value = [];
    friendStore.setUnread(0);
  } finally {
    loading.value = false;
  }
}

async function acceptRequest(request) {
  processingId.value = request.id;
  try {
    await $fetch(`/friends/request/${request.id}/accept`, {
      method: "PATCH",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    // Remove từ list
    friendRequests.value = friendRequests.value.filter(
      (r) => r.id !== request.id
    );
    friendStore.decrementUnread();
  } catch (err) {
    console.error("Lỗi chấp nhận kết bạn:", err);
    alert(err?.data?.message || "Không thể chấp nhận");
  } finally {
    processingId.value = null;
  }
}

async function rejectRequest(request) {
  processingId.value = request.id;
  try {
    await $fetch(`/friends/request/${request.id}/reject`, {
      method: "PATCH",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    // Remove từ list
    friendRequests.value = friendRequests.value.filter(
      (r) => r.id !== request.id
    );
    friendStore.decrementUnread();
  } catch (err) {
    console.error("Lỗi từ chối kết bạn:", err);
    alert(err?.data?.message || "Không thể từ chối");
  } finally {
    processingId.value = null;
  }
}

onMounted(() => {
  if (!auth.isLoggedIn) return;

  // Listen socket event từ friend request
  if ($socket) {
    // Chỉ cập nhật danh sách hiển thị nếu dropdown đang mở.
    // Việc tăng badge được xử lý ở plugin socket để đảm bảo toàn cục.
    $socket.on("friend_request_received", (data) => {
      console.log("Received friend request:", data);
      if (dropdownOpen.value && data.friendRequest) {
        const newRequest = {
          ...data.friendRequest,
          senderName:
            data.friendRequest.senderName ||
            data.notification?.title ||
            "Người dùng",
        };
        friendRequests.value.unshift(newRequest);
      }
    });
  }
});

onBeforeUnmount(() => {
  if ($socket) {
    $socket.off("friend_request_received");
  }
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

<template>
  <aside
    :class="[
      'bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col transition-all duration-300 overflow-hidden',
      isOpen ? 'w-64' : 'w-16', // thu nhỏ chứ KHÔNG ẩn
    ]"
    style="max-height: 60vh; min-width: 48px"
  >
    <!-- Header -->
    <div class="flex items-center justify-between p-3 border-b bg-gray-50">
      <h2 v-if="isOpen" class="text-base font-bold text-gray-700">Chat</h2>
      <button
        v-if="showToggle"
        @click="$emit('toggle')"
        class="p-2 rounded hover:bg-gray-100"
        :title="isOpen ? 'Thu gọn' : 'Mở rộng'"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
    </div>

    <!-- Danh sách user -->
    <nav class="flex-1 space-y-1 px-2 py-2 overflow-y-auto">
      <button
        v-for="user in users"
        :key="user.id"
        @click="$emit('openChat', user)"
        class="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
        :title="!isOpen ? user.fullName : ''"
      >
        <img
          v-if="user.avatar"
          :src="user.avatar"
          alt="avatar"
          class="w-8 h-8 rounded-full object-cover"
        />
        <UserCircle v-else class="w-6 h-6 text-gray-500" />
        <span v-if="isOpen" class="truncate">{{ user.fullName }}</span>
      </button>
    </nav>
  </aside>
</template>

<script setup>
import { UserCircle } from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";

const props = defineProps({
  currentUserId: { type: String, required: true },
  isOpen: { type: Boolean, default: true },
  showToggle: { type: Boolean, default: true },
});

const emit = defineEmits(["openChat", "toggle"]);

const config = useRuntimeConfig();
const auth = useAuthStore();
const users = ref([]);

onMounted(async () => {
  try {
    const res = await $fetch("/users", {
      method: "GET",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    users.value = Array.isArray(res)
      ? res.filter((u) => u.id !== props.currentUserId)
      : [];
  } catch (e) {
    console.error("Lỗi lấy danh sách user:", e);
    users.value = [];
  }
});
</script>

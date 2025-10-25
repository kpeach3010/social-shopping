<template>
  <aside
    :class="[
      'bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col transition-all duration-300 overflow-hidden',
      isOpen ? 'w-64' : 'w-16',
    ]"
    style="max-height: 60vh; min-width: 48px"
  >
    <!-- Header -->
    <div class="flex items-center justify-between p-3 border-b bg-gray-50">
      <h2 v-if="isOpen" class="text-base font-bold text-gray-700">
        <!-- tôi muốn icon nằm ngang chat -->
        Chat
        <ChatBubbleOvalLeftEllipsisIcon class="w-6 h-6 inline-block mr-1" />
      </h2>
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

    <!-- Tabs -->
    <div class="flex gap-2 border-b">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        @click="activeTab = tab.value"
        class="px-4 py-2 text-sm font-medium transition border-b-2"
        :class="[
          activeTab === tab.value
            ? 'border-black text-black font-semibold'
            : 'border-transparent text-gray-500 hover:text-black',
        ]"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Danh sách -->
    <nav class="flex-1 space-y-1 px-2 py-2 overflow-y-auto">
      <!-- Direct -->
      <template v-if="activeTab === 'direct'">
        <button
          v-for="user in users"
          :key="user.id"
          @click="$emit('openChat', { type: 'direct', partner: user })"
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
      </template>

      <!-- Group -->
      <template v-else>
        <button
          v-for="conv in groupConversations"
          :key="conv.id"
          @click="$emit('openChat', { type: 'group', conversation: conv })"
          class="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
          :title="!isOpen ? conv.name : ''"
        >
          <UserGroupIcon class="w-6 h-6" />
          <span v-if="isOpen" class="truncate">{{ conv.name }}</span>
        </button>
      </template>
    </nav>
  </aside>
</template>

<script setup>
import { UserCircle } from "lucide-vue-next";
import {
  UserGroupIcon,
  ChatBubbleOvalLeftEllipsisIcon,
} from "@heroicons/vue/24/outline";
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
const groupConversations = ref([]);
const { $socket } = useNuxtApp();

const tabs = [
  { value: "direct", label: "Cá nhân" },
  { value: "group", label: "Nhóm" },
];
const activeTab = ref("direct");

onMounted(async () => {
  try {
    // direct
    const res = await $fetch("/users", {
      method: "GET",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    users.value = Array.isArray(res)
      ? res.filter((u) => u.id !== props.currentUserId)
      : [];

    // group
    const resGroups = await $fetch("/conversations/group?type=group", {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    groupConversations.value = resGroups;

    const allConversations = await $fetch("/conversations", {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    // if (typeof window !== "undefined") {
    //   window.__conversations = allConversations;

    //   // join tất cả room tương ứng
    //   allConversations.forEach((conv) => {
    //     $socket.emit("join-conversation", conv.id);
    //   });
    // }

    if (Array.isArray(allConversations)) {
      for (const conv of allConversations) {
        $socket.emit("join-conversation", conv.id);
      }
    }

    $socket.on("group-activated", async ({ conversationId }) => {
      const exists = groupConversations.value.some(
        (g) => g.id === conversationId
      );
      if (!exists) {
        const newGroup = await $fetch(`/conversations/${conversationId}`, {
          baseURL: config.public.apiBase,
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        });
        // chỉ thêm nếu là group
        if (newGroup?.type === "group") groupConversations.value.push(newGroup);
      }
      $socket.emit("join-conversation", conversationId);
    });
  } catch (e) {
    console.error("Lỗi load sidebar:", e);
    users.value = [];
  }
});
onBeforeUnmount(() => {
  $socket.off("group-activated");
});
</script>

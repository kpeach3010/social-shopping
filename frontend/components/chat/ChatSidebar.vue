<template>
  <aside
    ref="sidebarRef"
    :class="[
      'bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col transition-shadow duration-300 overflow-hidden fixed z-50',
      isOpen ? 'w-64' : 'w-16',
      isDragging ? 'cursor-grabbing shadow-2xl' : '',
    ]"
    :style="{
      maxHeight: '60vh',
      minWidth: '48px',
      top: position.top + 'px',
      left: position.left + 'px',
      visibility: isInitialized ? 'visible' : 'hidden', // Ẩn đi cho đến khi tính xong vị trí ban đầu
    }"
  >
    <div
      class="flex items-center justify-between p-3 border-b bg-gray-50 cursor-move select-none"
      @mousedown="startDrag"
    >
      <h2
        v-if="isOpen"
        class="text-base font-bold text-gray-700 pointer-events-none"
      >
        Chat
        <ChatBubbleOvalLeftEllipsisIcon class="w-6 h-6 inline-block mr-1" />
      </h2>

      <button
        v-if="showToggle"
        @mousedown.stop
        @click="$emit('toggle')"
        class="p-2 rounded hover:bg-gray-100 cursor-pointer"
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

    <nav class="flex-1 space-y-1 px-2 py-2 overflow-y-auto" @mousedown.stop>
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
import { ref, onMounted, onBeforeUnmount } from "vue"; // Import thêm ref, lifecycle
import { UserCircle } from "lucide-vue-next";
import {
  UserGroupIcon,
  ChatBubbleOvalLeftEllipsisIcon,
} from "@heroicons/vue/24/outline";
import { useAuthStore } from "@/stores/auth";
import { useWaitForAuthReady } from "@/composables/useWaitForAuthReady";

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

// --- LOGIC KÉO THẢ (DRAG & DROP) ---
const sidebarRef = ref(null);
const isInitialized = ref(false);
const isDragging = ref(false);
const position = ref({ top: 0, left: 0 });
const dragOffset = ref({ x: 0, y: 0 });

// Hàm đặt vị trí mặc định (Góc phải dưới)
const setDefaultPosition = () => {
  if (sidebarRef.value) {
    const el = sidebarRef.value;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const elWidth = el.offsetWidth || 256; // 256px ~ w-64
    const elHeight = el.offsetHeight || 400;

    // Cách lề phải 20px, lề dưới 20px
    position.value.left = windowWidth - elWidth - 20;
    position.value.top = windowHeight - elHeight - 20;
    isInitialized.value = true;
  }
};

const startDrag = (event) => {
  isDragging.value = true;
  const rect = sidebarRef.value.getBoundingClientRect();

  // Tính khoảng cách từ con trỏ chuột đến góc trái trên của element
  dragOffset.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };

  // Thêm sự kiện vào window để khi kéo chuột nhanh ra ngoài element vẫn bắt được
  window.addEventListener("mousemove", onDrag);
  window.addEventListener("mouseup", stopDrag);
};

const onDrag = (event) => {
  if (!isDragging.value) return;

  let newLeft = event.clientX - dragOffset.value.x;
  let newTop = event.clientY - dragOffset.value.y;

  // Giới hạn không cho kéo ra ngoài màn hình (Optional)
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const elWidth = sidebarRef.value.offsetWidth;
  const elHeight = sidebarRef.value.offsetHeight;

  // Giới hạn màn hình
  if (newLeft < 0) newLeft = 0;
  if (newLeft + elWidth > windowWidth) newLeft = windowWidth - elWidth;
  if (newTop < 0) newTop = 0;
  if (newTop + elHeight > windowHeight) newTop = windowHeight - elHeight;

  position.value.left = newLeft;
  position.value.top = newTop;
};

const stopDrag = () => {
  isDragging.value = false;
  window.removeEventListener("mousemove", onDrag);
  window.removeEventListener("mouseup", stopDrag);
};
// -----------------------------------

async function loadSidebarData() {
  try {
    // Danh sách user
    const res = await $fetch("/users", {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    users.value = Array.isArray(res)
      ? res.filter((u) => u.id !== props.currentUserId)
      : [];

    // Nhóm chat
    const resGroups = await $fetch("/conversations/group?type=group", {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    groupConversations.value = Array.isArray(resGroups) ? resGroups : [];

    // Join tất cả cuộc hội thoại
    const allConversations = await $fetch("/conversations", {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    if (Array.isArray(allConversations)) {
      for (const conv of allConversations) {
        $socket.emit("join-conversation", conv.id);
      }
    }

    // 4️Khi nhóm được kích hoạt mới
    $socket.on("group-activated", async ({ conversationId }) => {
      const exists = groupConversations.value.some(
        (g) => g.id === conversationId
      );
      if (!exists) {
        const newGroup = await $fetch(`/conversations/${conversationId}`, {
          baseURL: config.public.apiBase,
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        });
        if (newGroup?.type === "group") groupConversations.value.push(newGroup);
      }
      $socket.emit("join-conversation", conversationId);
    });

    // Khi mình rời nhóm (hoặc bị kick), Backend gửi 'force-close-chat' cho UserID
    $socket.on("force-close-chat", ({ conversationId }) => {
      // Ép kiểu String để so sánh chính xác
      groupConversations.value = groupConversations.value.filter(
        (g) => String(g.id) !== String(conversationId)
      );
    });

    // Khi nhóm bị giải tán (Admin xóa hoặc rời hết)
    $socket.on("group-deleted", ({ conversationId }) => {
      // Ép kiểu String
      groupConversations.value = groupConversations.value.filter(
        (g) => String(g.id) !== String(conversationId)
      );
    });
  } catch (e) {
    console.error("Lỗi load sidebar:", e);
    users.value = [];
  }
}

onMounted(async () => {
  // Khởi tạo vị trí ban đầu
  // Dùng setTimeout nhỏ để đảm bảo DOM đã render xong width/height
  setTimeout(() => {
    setDefaultPosition();
  }, 100);

  // Xử lý resize window để chat không bị mất ra ngoài
  window.addEventListener("resize", setDefaultPosition);

  const isReady = await useWaitForAuthReady();
  if (!isReady) return;
  await loadSidebarData();
});

onBeforeUnmount(() => {
  $socket.off("group-activated");
  $socket.off("force-close-chat");
  $socket.off("group-deleted");

  window.removeEventListener("resize", setDefaultPosition);
  window.removeEventListener("mousemove", onDrag);
  window.removeEventListener("mouseup", stopDrag);
});
</script>

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
        <template v-if="users.length">
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

          <!-- Nếu chỉ có staff (không có bạn bè) thì vẫn hiển thị thông điệp khuyến khích kết bạn -->
          <div
            v-if="isOpen && !hasFriends && auth.user?.role === 'customer'"
            class="mt-2 px-3 py-2 text-xs text-gray-500 text-center"
          >
            Bạn chưa có bạn bè nào. Hãy thêm bạn bè để cùng trò chuyện nhé!
          </div>
        </template>
        <div
          v-else
          class="flex items-center justify-center w-full px-3 py-4 text-sm text-gray-500"
        >
          <span v-if="isOpen" class="text-center">
            Bạn chưa có bạn bè nào. Hãy thêm bạn bè để cùng trò chuyện nhé!
          </span>
        </div>
      </template>

      <template v-else>
        <template v-if="groupConversations.length">
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
        <div
          v-else
          class="flex items-center justify-center w-full px-3 py-4 text-sm text-gray-500"
        >
          <span
            v-if="isOpen && auth.user?.role === 'customer'"
            class="text-center"
          >
            Bạn chưa có nhóm mua hàng nào. Tạo nhóm để cùng bạn bè mua với giá
            ưu đãi hơn.
          </span>
        </div>
      </template>
    </nav>
  </aside>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue"; // Import thêm nextTick
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
const hasFriends = ref(false);
const groupConversations = ref([]);
const { $socket } = useNuxtApp();

// Storage cho debounced resize handler
let resizeTimeout = null;
const handleResize = () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(setDefaultPosition, 100);
};

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

// Hàm đặt vị trí mặc định (Góc phải dưới nhưng đảm bảo trong màn hình)
const setDefaultPosition = () => {
  if (!sidebarRef.value) return;

  const el = sidebarRef.value;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  // Đợi element render xong rồi mới tính toán
  nextTick(() => {
    const elWidth = el.offsetWidth || (props.isOpen ? 256 : 64);
    const elHeight = el.offsetHeight || 400;

    // Tính toán vị trí với padding an toàn
    const safeMargin = 20;
    const maxLeft = windowWidth - elWidth - safeMargin;
    const maxTop = windowHeight - elHeight - safeMargin;

    // Đảm bảo không bị âm
    position.value.left = Math.max(safeMargin, maxLeft);
    position.value.top = Math.max(safeMargin, maxTop);

    // Nếu màn hình quá nhỏ, đặt ở góc trên phải
    if (windowWidth < elWidth + 40) {
      position.value.left = safeMargin;
      position.value.top = safeMargin;
    }

    isInitialized.value = true;
  });
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

  // Giới hạn chặt chẽ hơn để không bị ra ngoài màn hình
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const elWidth = sidebarRef.value.offsetWidth;
  const elHeight = sidebarRef.value.offsetHeight;
  const safeMargin = 10;

  // Constrains với margin an toàn
  if (newLeft < safeMargin) newLeft = safeMargin;
  if (newLeft + elWidth > windowWidth - safeMargin) {
    newLeft = windowWidth - elWidth - safeMargin;
  }
  if (newTop < safeMargin) newTop = safeMargin;
  if (newTop + elHeight > windowHeight - safeMargin) {
    newTop = windowHeight - elHeight - safeMargin;
  }

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
    // Danh sách bạn bè
    const res = await $fetch("/friends", {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    const friendList = Array.isArray(res?.data) ? res.data : [];
    let directUsers = friendList.filter((u) => u.id !== props.currentUserId);
    hasFriends.value = directUsers.length > 0;

    // Nếu là khách hàng, hiển thị thêm tất cả user có role = staff
    if (auth.user?.role === "customer") {
      const allUsers = await $fetch("/users", {
        baseURL: config.public.apiBase,
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });

      const allUsersArr = Array.isArray(allUsers) ? allUsers : [];
      const staffUsers = allUsersArr.filter(
        (u) =>
          u.role === "staff" &&
          u.id !== props.currentUserId &&
          !directUsers.some((ex) => ex.id === u.id),
      );

      if (staffUsers.length > 0) {
        directUsers = [...directUsers, ...staffUsers];
      }
    } else if (auth.user?.role === "staff" || auth.user?.role === "admin") {
      // Staff hoặc Admin: hiển thị tất cả người dùng (trừ chính mình)
      const allUsers = await $fetch("/users", {
        baseURL: config.public.apiBase,
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });

      const allUsersArr = Array.isArray(allUsers) ? allUsers : [];
      directUsers = allUsersArr.filter((u) => u.id !== props.currentUserId);
    }

    users.value = directUsers;

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
        (g) => g.id === conversationId,
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
        (g) => String(g.id) !== String(conversationId),
      );
    });

    // Khi nhóm bị giải tán (Admin xóa hoặc rời hết)
    $socket.on("group-deleted", ({ conversationId }) => {
      // Ép kiểu String
      groupConversations.value = groupConversations.value.filter(
        (g) => String(g.id) !== String(conversationId),
      );
    });
  } catch (e) {
    console.error("Lỗi load sidebar:", e);
    users.value = [];
  }
}

onMounted(async () => {
  // Khởi tạo vị trí ban đầu với timeout dài hơn để đảm bảo render xong
  setTimeout(() => {
    setDefaultPosition();
  }, 200);

  // Xử lý resize window với debounce
  window.addEventListener("resize", handleResize);

  const isReady = await useWaitForAuthReady();
  if (!isReady) return;
  await loadSidebarData();
});

onBeforeUnmount(() => {
  $socket.off("group-activated");
  $socket.off("force-close-chat");
  $socket.off("group-deleted");

  // Cleanup tất cả event listeners
  clearTimeout(resizeTimeout);
  window.removeEventListener("resize", handleResize);
  window.removeEventListener("mousemove", onDrag);
  window.removeEventListener("mouseup", stopDrag);
});
</script>

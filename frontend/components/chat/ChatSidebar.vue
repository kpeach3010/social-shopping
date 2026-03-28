<template>
  <aside
    ref="sidebarRef"
    :class="[
      'bg-white border-gray-200 shadow-xl flex flex-col overflow-hidden fixed z-50',
      // Chỉ bật transition trên Desktop, mobile sẽ tắt hiệu ứng theo yêu cầu người dùng
      !isDragging && !isMobile ? 'transition-all duration-300' : 'transition-none',
      // Desktop styles
      !isMobile ? (isOpen ? 'w-64 border rounded-lg' : 'w-16 border rounded-lg') : '',
      // Mobile styles
      isMobile ? (isOpen ? 'bottom-0 left-0 w-full h-[60vh] rounded-t-3xl border-t' : 'bottom-6 right-6 w-14 h-14 rounded-full border shadow-2xl flex items-center justify-center translate-y-0') : '',
      isDragging && !isMobile ? 'cursor-grabbing shadow-2xl scale-[1.02]' : '',
    ]"
    :style="!isMobile ? {
      maxHeight: '60vh',
      minWidth: '48px',
      top: position.top + 'px',
      left: position.left + 'px',
      visibility: isInitialized ? 'visible' : 'hidden',
    } : {
      visibility: isInitialized ? 'visible' : 'hidden',
    }"
    @click.stop="isMobile && !isOpen ? $emit('toggle') : null"
  >
    <!-- Trạng thái thu gọn trên Mobile: Chỉ hiện Icon -->
    <div v-if="isMobile && !isOpen" class="flex items-center justify-center w-full h-full cursor-pointer hover:bg-gray-50 transition-colors">
      <ChatBubbleOvalLeftEllipsisIcon class="w-7 h-7 text-gray-700" />
    </div>

    <!-- Nội dung đầy đủ (Desktop hoặc Mobile khi mở) -->
    <template v-else>
    <div
      class="flex items-center justify-between p-3 border-b bg-gray-50 cursor-move select-none"
      @mousedown="startDrag"
    >
      <h2
        v-if="isOpen || isMobile"
        class="text-sm sm:text-base font-bold text-gray-700 pointer-events-none flex items-center gap-1"
      >
        <ChatBubbleOvalLeftEllipsisIcon class="w-5 h-5 sm:w-6 sm:h-6" />
        <span v-if="isOpen">Trò chuyện</span>
      </h2>

      <button
        v-if="showToggle && !isMobile"
        @mousedown.stop
        @click.stop="$emit('toggle')"
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
      <div v-if="isMobile && isOpen" class="ml-auto pr-3 flex items-center">
        <button @click.stop="$emit('toggle')" class="p-2 -mr-1 text-gray-500 hover:text-black">
           <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
           </svg>
        </button>
      </div>
    </div>

    <nav class="flex-1 space-y-1 px-2 py-2 overflow-y-auto" @mousedown.stop>
      <template v-if="activeTab === 'direct'">
        <template v-if="users.length">
          <button
            v-for="user in users"
            :key="user.id"
            @click="handleOpenChat({ type: 'direct', partner: user })"
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
            @click="handleOpenChat({ type: 'group', conversation: conv })"
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
    </template>
  </aside>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from "vue"; // Import thêm watch
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
const isMobile = ref(false);

const handleOpenChat = (data) => {
  emit("openChat", data);
  // Trên mobile, sau khi mở chat thì tự động đóng sidebar lại
  if (isMobile.value && props.isOpen) {
    emit("toggle");
  }
};

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768;
};

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

// Lưu vị trí trước khi mở rộng để khôi phục khi thu gọn
const savedPosition = ref(null);

// Hàm đặt vị trí mặc định (Góc phải dưới nhưng đảm bảo trong màn hình)
const setDefaultPosition = () => {
  checkMobile();
  if (isMobile.value) {
    isInitialized.value = true;
    return;
  }
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

// Hàm kiểm tra và điều chỉnh vị trí khi size thay đổi
const adjustPositionForResize = () => {
  if (isMobile.value || !sidebarRef.value || !isInitialized.value) return;

  nextTick(() => {
    const el = sidebarRef.value;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const elWidth = el.offsetWidth;
    const elHeight = el.offsetHeight;
    const safeMargin = 20;

    // Kiểm tra nếu bị tràn ra ngoài thì điều chỉnh
    if (position.value.left + elWidth > windowWidth - safeMargin) {
      position.value.left = Math.max(
        safeMargin,
        windowWidth - elWidth - safeMargin,
      );
    }

    if (position.value.top + elHeight > windowHeight - safeMargin) {
      position.value.top = Math.max(
        safeMargin,
        windowHeight - elHeight - safeMargin,
      );
    }

    // Đảm bảo không bị âm
    position.value.left = Math.max(safeMargin, position.value.left);
    position.value.top = Math.max(safeMargin, position.value.top);
  });
};

const startDrag = (event) => {
  if (isMobile.value) return; // Không cho phép kéo trên mobile
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
  window.addEventListener("resize", () => {
    checkMobile();
    handleResize();
  });

  const isReady = await useWaitForAuthReady();
  if (!isReady) return;
  await loadSidebarData();
});

// Watch sự thay đổi isOpen để lưu/khôi phục vị trí
watch(
  () => props.isOpen,
  (newOpen, oldOpen) => {
    // Chờ CSS transition hoàn thành
    setTimeout(() => {
      if (newOpen && !oldOpen) {
        // Đang chuyển từ thu gọn sang mở rộng
        // Lưu vị trí hiện tại trước khi điều chỉnh
        savedPosition.value = {
          top: position.value.top,
          left: position.value.left,
        };

        // Điều chỉnh vị trí nếu bị tràn
        adjustPositionForResize();
      } else if (!newOpen && oldOpen) {
        // Đang chuyển từ mở rộng sang thu gọn
        // Khôi phục về vị trí trước khi mở rộng
        if (savedPosition.value) {
          position.value = {
            top: savedPosition.value.top,
            left: savedPosition.value.left,
          };

          // Kiểm tra lại xem vị trí cũ có hợp lệ không (trong trường hợp màn hình thay đổi)
          nextTick(() => {
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const elWidth = 64; // kích thước khi thu gọn
            const safeMargin = 20;

            // Đảm bảo vẫn trong màn hình
            if (position.value.left + elWidth > windowWidth - safeMargin) {
              position.value.left = windowWidth - elWidth - safeMargin;
            }
            if (position.value.top > windowHeight - safeMargin) {
              position.value.top = windowHeight - 100; // chiều cao tối thiểu
            }

            position.value.left = Math.max(safeMargin, position.value.left);
            position.value.top = Math.max(safeMargin, position.value.top);
          });
        }
      }
    }, 50);
  },
  { immediate: false },
);

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

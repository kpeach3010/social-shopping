<template>
  <div
    class="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-neutral-50 to-zinc-100 p-4"
  >
    <div
      class="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center border border-gray-200"
    >
      <h1 class="text-2xl font-bold text-gray-800 mb-4">
        Mời tham gia nhóm mua chung
      </h1>

      <!-- Loading -->
      <div v-if="loading" class="my-6 text-gray-500">
        Đang kiểm tra link mời...
      </div>

      <!-- Lỗi -->
      <div v-else-if="error" class="my-6">
        <span class="text-red-500 font-semibold text-lg">{{ error }}</span>
        <div class="mt-4">
          <button
            @click="goHome"
            class="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
          >
            Về trang chủ
          </button>
        </div>
      </div>

      <!-- Nội dung hợp lệ -->
      <div v-else class="space-y-6">
        <!-- Thông tin sản phẩm -->
        <div class="flex flex-col items-center">
          <img
            v-if="inviteDetail?.product?.thumbnailUrl"
            :src="inviteDetail.product.thumbnailUrl"
            alt="Ảnh sản phẩm"
            class="w-40 h-40 object-cover rounded-xl shadow mb-3"
          />
          <h2 class="text-lg font-semibold text-gray-900">
            {{ inviteDetail?.product?.name }}
          </h2>
          <p class="text-gray-600 text-sm">
            Giá:
            <span class="font-semibold text-gray-800">{{
              formatPrice(inviteDetail?.product?.price_default)
            }}</span>
          </p>
          <p class="text-gray-600 text-sm">
            Tồn kho: {{ inviteDetail?.product?.stock }}
          </p>
        </div>

        <!-- Thông tin coupon -->
        <div class="bg-neutral-50 border rounded-lg p-4 text-sm text-gray-700">
          <p>
            Mã giảm giá:
            <strong>{{ inviteDetail?.coupon?.code || "Không có" }}</strong>
          </p>
          <p>
            Loại:
            <strong>{{
              inviteDetail?.coupon?.kind === "group" ? "Nhóm" : "Cá nhân"
            }}</strong>
          </p>
          <p>
            Giá trị:
            <strong>
              {{
                inviteDetail?.coupon?.type === "percent"
                  ? inviteDetail?.coupon?.value + "%"
                  : formatPrice(inviteDetail?.coupon?.value)
              }}
            </strong>
          </p>

          <!-- Đơn tối thiếu -->
          <p v-if="inviteDetail?.coupon?.minOrderTotal">
            Đơn tối thiểu:
            <strong
              >{{
                formatPrice(inviteDetail?.coupon?.minOrderTotal)
              }}/người</strong
            >
          </p>

          <p>Hạn dùng: {{ formatDate(inviteDetail?.coupon?.endsAt) }}</p>
        </div>

        <!-- Thông tin nhóm -->
        <div
          v-if="inviteDetail?.groupOrder"
          class="bg-neutral-50 border rounded-lg p-4 text-sm text-gray-700 text-left"
        >
          <p>
            Trạng thái nhóm:
            <strong>{{ statusText(inviteDetail?.groupOrder?.status) }}</strong>
          </p>
          <p>
            Thành viên hiện tại:
            <strong>{{ inviteDetail?.groupOrder?.currentMember }}</strong> /
            <strong>{{ inviteDetail?.groupOrder?.targetMember }}</strong>
          </p>
          <p>
            Trưởng nhóm:
            <strong>{{ inviteDetail?.creator?.fullName }}</strong>
          </p>
          <p>Email: {{ inviteDetail?.creator?.email }}</p>
        </div>

        <!-- 1. Nếu là người tạo link -->
        <div v-if="isCreator" class="text-center space-y-4">
          <div
            class="text-gray-800 font-medium border border-gray-200 bg-gray-50 p-3 rounded-lg"
          >
            {{ info }}
          </div>

          <div v-if="inviteDetail?.conversation" class="mt-3">
            <button
              @click="openChatBox"
              class="px-5 py-2 bg-black text-white rounded-lg hover:bg-neutral-800 font-medium"
            >
              Mở chat nhóm
            </button>
          </div>
        </div>

        <!-- 2. Nếu đã join thành công ngay trong session này -->
        <div v-else-if="success" class="mt-5 text-center">
          <p class="text-green-600 font-semibold text-lg mb-3">
            🎉 Tham gia nhóm thành công!
          </p>
          <button
            @click="openChatBox"
            class="px-6 py-2 bg-black text-white rounded-lg hover:bg-neutral-800 font-medium"
          >
            Mở chat nhóm
          </button>
        </div>

        <!-- 3. Nếu user đã là thành viên (đã join từ trước) -->
        <div
          v-else-if="alreadyJoined"
          class="text-center text-green-600 font-medium border border-green-200 bg-green-50 p-3 rounded-lg"
        >
          Bạn đã là thành viên của nhóm này 🎉
          <div class="mt-4">
            <button
              @click="openChatBox"
              class="px-5 py-2 bg-black text-white rounded-lg hover:bg-neutral-800 font-medium"
            >
              Mở chat nhóm
            </button>
          </div>
        </div>

        <!-- 4. Thông báo cho Staff/Admin (Không phải Customer) -->
        <div
          v-else-if="auth.isLoggedIn && !auth.isCustomer"
          class="p-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-5 h-5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
          Tài khoản nhân viên/admin không thể tham gia nhóm mua chung.
        </div>

        <!-- 5. Nếu nhóm bị khóa/hủy/hết hạn (vào khi không phải member/creator) -->
        <div
          v-else-if="inviteDetail?.groupOrder && inviteDetail?.groupOrder?.status !== 'pending'"
          class="text-center text-red-500 font-medium border border-red-200 bg-red-50 p-3 rounded-lg"
        >
          {{ lockedMessage(inviteDetail?.groupOrder?.status) }}
          <div class="mt-4">
            <button
              @click="goHome"
              class="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              Về trang chủ
            </button>
          </div>
        </div>

        <!-- 6. Nút Tham gia (Mặc định cho khách hoặc user chưa join và nhóm còn mở) -->
        <div v-else>
          <button
            @click="joinGroup"
            :disabled="joining"
            class="w-full py-2 bg-black text-white rounded-lg hover:bg-neutral-800 font-medium disabled:bg-neutral-400 transition"
          >
            {{ joining ? "Đang tham gia..." : "Tham gia nhóm" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const router = useRouter();
const config = useRuntimeConfig();
const auth = useAuthStore();
const { $socket } = useNuxtApp();

const loading = ref(true);
const joining = ref(false);
const success = ref(false);
const error = ref("");
const inviteDetail = ref(null);
const conversation = ref(null);
const alreadyJoined = ref(false);
const isCreator = ref(false);
const info = ref("");

const loadInviteData = async () => {
  const token = route.params.token;
  if (!token) {
    error.value = "Link mời không hợp lệ.";
    loading.value = false;
    return;
  }
  try {
    const res = await $fetch(`/conversations/invite-links/${token}`, {
      baseURL: config.public.apiBase,
      headers: auth.accessToken
        ? { Authorization: `Bearer ${auth.accessToken}` }
        : {},
    });

    inviteDetail.value = res;

    // Nếu là người tạo link
    if (auth.user && res?.creator?.id === auth.user.id) {
      isCreator.value = true;
      if (res.conversation) {
        info.value = "Bạn là Trưởng nhóm. Có thể vào chat nhóm.";
      } else {
        info.value =
          "Bạn là Trưởng nhóm. Chờ người khác tham gia để nhóm được kích hoạt.";
      }
      return; // Dừng lại, không auto join
    }

    // Nếu người dùng đã trong danh sách thành viên
    if (auth.user && res?.members?.some((m) => m.id === auth.user.id)) {
      alreadyJoined.value = true;
    }

    if (res.conversation?.id) {
      // console.log("Joining socket room update:", res.conversation.id);
      $socket.emit("join-conversation", res.conversation.id);
    }
  } catch (e) {
    error.value =
      e?.data?.message ||
      e?.message ||
      "Link mời không hợp lệ hoặc đã hết hạn.";
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await loadInviteData();

  // --- LOGIC SOCKET CẬP NHẬT REALTIME ---

  // 1. Hàm xử lý chung khi có người khác ra/vào
  const handleMemberChange = (payload) => {
    // Ép kiểu string để so sánh an toàn
    const currentConvId = String(inviteDetail.value?.conversation?.id || "");
    const payloadConvId = String(payload.conversationId || "");

    if (currentConvId && currentConvId === payloadConvId) {
      console.log("Thành viên thay đổi, reload...");
      loadInviteData();
    }
  };

  $socket.on("user-left", handleMemberChange);
  $socket.on("user-joined", handleMemberChange);

  // 2. [QUAN TRỌNG NHẤT] Xử lý khi CHÍNH MÌNH rời nhóm (hoặc bị kick)
  // Server gửi event này đích danh cho user ID
  $socket.on("force-close-chat", async (payload) => {
    const currentConvId = String(inviteDetail.value?.conversation?.id || "");
    const payloadConvId = String(payload.conversationId || "");

    if (currentConvId === payloadConvId) {
      console.log("Bạn đã rời nhóm, cập nhật UI ngay lập tức.");

      // Reset các cờ trạng thái ngay lập tức để UI đổi nút
      alreadyJoined.value = false;
      success.value = false;
      isCreator.value = false; // Đề phòng trường hợp chuyển quyền
      conversation.value = null;

      // Gọi API lấy lại dữ liệu mới nhất (số lượng thành viên, v.v.)
      await loadInviteData();
    }
  });

  // 3. Xử lý giải tán nhóm
  $socket.on("group-deleted", (payload) => {
    const currentConvId = String(inviteDetail.value?.conversation?.id || "");
    if (currentConvId === String(payload.conversationId)) {
      alert("Nhóm này đã bị giải tán.");
      router.push("/");
    }
  });
});

onBeforeUnmount(() => {
  $socket.off("user-left");
  $socket.off("user-joined");
  $socket.off("force-close-chat");
  $socket.off("group-deleted");
});

async function joinGroup() {
  const token = route.params.token;
  if (!auth.accessToken) {
    alert("Bạn cần đăng nhập để tham gia nhóm.");
    return;
  }

  joining.value = true;
  try {
    const res = await $fetch(`/conversations/join/${token}`, {
      method: "POST",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    if (!res?.conversationId)
      throw new Error("Không tìm thấy nhóm hoặc nhóm đã bị khóa.");

    conversation.value = res;
    success.value = true;
    alreadyJoined.value = true;

    await loadInviteData();
  } catch (e) {
    console.error("Join error:", e);
    
    // Bóc tách thông báo lỗi chuẩn từ backend
    const backendError = 
      e?.response?._data?.error || 
      e?.data?.error || 
      e?.response?._data?.message ||
      e?.data?.message;

    if (backendError) {
      alert(backendError);
    } else {
      alert(`Không thể tham gia nhóm: Có lỗi xảy ra. Vui lòng thử lại sau.`);
    }
  } finally {
    joining.value = false;
  }
}

async function openChatBox() {
  const conv = conversation.value || inviteDetail.value?.conversation;
  if (!conv) return;

  const conversationId = conv.id || conv.conversationId;
  console.log("conv: ", conv);
  console.log("=> conversationId chọn:", conversationId);

  if (!conversationId) {
    console.warn("Không xác định được conversationId:", conv);
    return;
  }

  const data = {
    id: conversationId,
    name: conv.name || conv.conversationName || "Nhóm mua chung",
    type: "group",
  };
  window.dispatchEvent(new CustomEvent("open-group-chat", { detail: data }));
}

function goHome() {
  router.push("/");
}

function formatPrice(v) {
  if (!v) return "—";
  return Number(v).toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
  });
}

function formatDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("vi-VN");
}

function statusText(status) {
  switch (status) {
    case "pending":
      return "Đang mở (có thể tham gia)";
    case "locked":
      return "Đã đủ thành viên (đang chọn hàng)";
    case "ordering":
      return "Đang đặt hàng";
    case "completed":
      return "Đã hoàn tất";
    case "cancelled":
      return "Đã hủy";
    default:
      return "Không xác định";
  }
}

function lockedMessage(status) {
  switch (status) {
    case "locked":
      return "Nhóm này đã đủ thành viên, không thể tham gia thêm.";
    case "ordering":
      return "Nhóm đang trong giai đoạn đặt hàng.";
    case "completed":
      return "Nhóm này đã hoàn tất đơn hàng.";
    case "cancelled":
      return "Nhóm này đã bị hủy hoặc hết hạn.";
    default:
      return "Không thể tham gia nhóm này.";
  }
}
</script>

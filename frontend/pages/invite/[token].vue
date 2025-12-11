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

        <!-- Nếu là người tạo link -->
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
        <!-- Nếu user chưa tham gia, không phải creator, và nhóm chưa khóa -->
        <div
          v-else-if="
            !alreadyJoined &&
            !isCreator &&
            (inviteDetail?.groupOrder?.status === 'pending' ||
              !inviteDetail?.groupOrder)
          "
        >
          <button
            @click="joinGroup"
            :disabled="joining"
            class="w-full py-2 bg-black text-white rounded-lg hover:bg-neutral-800 font-medium disabled:bg-neutral-400 transition"
          >
            {{ joining ? "Đang tham gia..." : "Tham gia nhóm" }}
          </button>
        </div>

        <!-- Nếu user đã tham gia -->
        <div
          v-else-if="alreadyJoined && !success"
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

        <!-- Khi join thành công -->
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

        <!-- Nếu nhóm bị khóa -->
        <div
          v-else-if="inviteDetail?.groupOrder?.status !== 'pending'"
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

const loading = ref(true);
const joining = ref(false);
const success = ref(false);
const error = ref("");
const inviteDetail = ref(null);
const conversation = ref(null);
const alreadyJoined = ref(false);
const isCreator = ref(false);
const info = ref("");

onMounted(async () => {
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
  } catch (e) {
    error.value =
      e?.data?.message ||
      e?.message ||
      "Link mời không hợp lệ hoặc đã hết hạn.";
  } finally {
    loading.value = false;
  }
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
  } catch (e) {
    console.error("Join error:", e);
    alert(
      e?.data?.message ||
        e?.message ||
        `Không thể tham gia nhóm: [${e?.response?.status || "?"}] ${
          e?.response?.url || ""
        }`
    );
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
    name: conv.name || "Nhóm mua chung",
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

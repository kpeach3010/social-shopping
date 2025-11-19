<template>
  <div v-if="open" class="fixed inset-0 flex items-center justify-center z-50">
    <!-- Overlay -->
    <div
      class="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
      @click="$emit('close')"
    ></div>

    <!-- Modal -->
    <div
      class="relative bg-white rounded-2xl shadow-2xl w-[640px] h-[600px] overflow-hidden flex flex-col z-10 animate-fade-in"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-5 py-3 border-b border-gray-200"
      >
        <h2 class="text-lg font-semibold text-gray-800">
          Chi tiết nhóm mua chung
        </h2>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600 transition"
        >
          ✕
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex border-b border-gray-200">
        <button
          v-for="tab in tabs"
          :key="tab"
          @click="activeTab = tab"
          class="flex-1 py-2 text-sm font-medium transition-all"
          :class="[
            activeTab === tab
              ? 'bg-black text-white rounded-t-lg'
              : 'text-gray-600 hover:bg-gray-100',
          ]"
        >
          {{ tab }}
        </button>
      </div>

      <!-- Content -->
      <div
        class="flex-1 overflow-y-auto p-5 space-y-4 text-sm text-gray-700 tab-content"
      >
        <!-- TAB 1: Thành viên nhóm -->
        <template v-if="activeTab === 'Thành viên nhóm'">
          <!-- Trạng thái nhóm -->
          <div class="flex items-center justify-between">
            <span class="font-medium">Trạng thái nhóm:</span>
            <span
              class="px-2 py-0.5 text-xs rounded-full font-semibold"
              :class="statusClass(groupOrder.status)"
            >
              {{ statusText(groupOrder.status) }}
            </span>
          </div>

          <!-- Tiến trình -->
          <div class="mt-3">
            <div class="flex justify-between text-xs text-gray-500 mb-1">
              <span>Thành viên</span>
              <span
                >{{ groupOrder.currentMember }}/{{
                  groupOrder.targetMember
                }}</span
              >
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div
                class="h-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-600 transition-all"
                :style="{
                  width:
                    Math.min(
                      (groupOrder.currentMember / groupOrder.targetMember) *
                        100,
                      100
                    ) + '%',
                }"
              ></div>
            </div>
          </div>

          <!-- Danh sách thành viên -->
          <div class="mt-4 space-y-3">
            <div
              v-for="m in members"
              :key="m.id"
              class="flex items-center gap-3 p-2 border border-gray-100 rounded-lg hover:bg-gray-50"
            >
              <UserCircleIcon class="w-8 h-8 text-gray-400" />
              <div>
                <p class="font-medium text-gray-800">
                  {{ m.id === auth.user?.id ? "Bạn" : m.fullName }}
                </p>
                <p class="text-xs text-gray-500">{{ memberRole(m) }}</p>
              </div>
            </div>
          </div>

          <!-- Nút mời thêm -->
          <div
            v-if="groupOrder.status === 'pending'"
            class="mt-3 flex justify-start items-center"
          >
            <button
              @click="showInvite = !showInvite"
              class="flex items-center text-sm text-black font-medium hover:underline transition"
            >
              <UserPlusIcon class="w-6 h-6 mr-2 text-black" />
              Mời thêm thành viên
            </button>
          </div>

          <!-- Hiển thị link token -->
          <transition name="fade">
            <div
              v-if="showInvite"
              class="mt-2 p-3 border border-gray-200 rounded-lg text-sm"
            >
              <p class="text-gray-800 mb-2">Link mời nhóm của bạn:</p>
              <div
                class="flex items-center justify-between bg-white border border-gray-300 rounded-lg px-3 py-2"
              >
                <a
                  v-if="fullInviteLink"
                  :href="fullInviteLink"
                  target="_blank"
                  class="text-sm text-black font-medium underline break-all"
                >
                  {{ fullInviteLink }}
                </a>
                <span v-else class="text-gray-500 text-sm"
                  >Không có link mời</span
                >

                <button
                  @click="copyToken"
                  class="text-black text-xs font-semibold hover:underline"
                >
                  Sao chép
                </button>
              </div>
            </div>
          </transition>
          <!-- Nút rời nhóm -->
          <div
            v-if="groupOrder.status === 'pending'"
            class="mt-5 flex justify-center"
          >
            <button
              @click="leaveGroup"
              class="px-5 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl shadow-sm transition"
            >
              Rời nhóm
            </button>
          </div>
        </template>

        <!-- TAB 2: Sản phẩm -->
        <template v-else>
          <div class="flex flex-col items-center space-y-3">
            <img
              :src="product.thumbnailUrrl"
              alt="Sản phẩm"
              class="w-40 h-40 object-cover rounded-lg shadow"
            />
            <p class="text-lg font-semibold text-gray-800 text-center">
              {{ product.name }}
            </p>
            <p class="text-gray-600 text-sm">
              Giá:
              <span class="font-semibold text-gray-800">{{
                formatPrice(product.price_default)
              }}</span>
            </p>
            <p class="text-gray-500 text-xs">Tồn kho: {{ product.stock }}</p>
          </div>

          <!-- Coupon -->
          <div
            class="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2 text-sm"
          >
            <p>
              Mã giảm giá:
              <strong>{{ coupon.code || "Không có" }}</strong>
            </p>
            <p>
              Loại:
              <strong>
                {{
                  coupon.type === "percent"
                    ? coupon.value + "%"
                    : formatPrice(coupon.value)
                }}
              </strong>
            </p>
            <p v-if="coupon.endsAt" class="text-gray-600">
              Hết hạn: {{ formatDate(coupon.endsAt) }}
            </p>
            <p v-if="coupon.minTotalQuantity" class="text-gray-600">
              Số lượng tối thiểu: {{ coupon.minTotalQuantity }}
            </p>
          </div>

          <!-- Thông tin khác -->
          <div class="mt-4 text-xs text-gray-500 text-right">
            <p>Ngày tạo nhóm: {{ formatDate(groupOrder.createdAt) }}</p>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { UserCircleIcon, UserPlusIcon } from "@heroicons/vue/24/outline";
import { useAuthStore } from "@/stores/auth";

const props = defineProps({
  open: Boolean,
  groupOrder: Object,
  product: Object,
  coupon: Object,
  members: Array,
  inviteToken: String,
});

const emit = defineEmits(["close"]);
const auth = useAuthStore();
const { $socket } = useNuxtApp();

const tabs = ["Thành viên nhóm", "Sản phẩm mua chung"];
const activeTab = ref("Thành viên nhóm");
const showInvite = ref(false);

const fullInviteLink = computed(() =>
  props.inviteToken
    ? `${window.location.origin}/invite/${props.inviteToken}`
    : null
);

function statusText(status) {
  switch (status) {
    case "pending":
      return "Đang mở";
    case "locked":
      return "Đã đủ thành viên";
    case "ordering":
      return "Đang đặt hàng";
    case "completed":
      return "Đã hoàn tất";
    case "cancelled":
      return "Đã huỷ";
    default:
      return "Không xác định";
  }
}

function statusClass(status) {
  return {
    pending: "bg-green-100 text-green-700",
    locked: "bg-yellow-100 text-yellow-700",
    ordering: "bg-blue-100 text-blue-700",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
  }[status];
}

function formatPrice(v) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(v || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

function copyToken() {
  if (!fullInviteLink.value) return;
  navigator.clipboard.writeText(fullInviteLink.value);
  alert("Đã sao chép link mời: " + fullInviteLink.value);
}

function memberRole(m) {
  const memberUserId = m.userId;
  const creatorId = props.groupOrder.creatorId;

  if (memberUserId === creatorId) return "Trưởng nhóm";

  return "Thành viên";
}

async function leaveGroup() {
  const ok = confirm("Bạn có chắc muốn rời nhóm này không?");
  if (!ok) return;

  try {
    const res = await $fetch(`/group-orders/${props.groupOrder.id}/leave`, {
      method: "PATCH",
      baseURL: useRuntimeConfig().public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    alert("Đã rời nhóm thành công.");
    emit("close");
  } catch (err) {
    console.error("Lỗi rời nhóm:", err);
    alert(err?.data?.error || "Không thể rời nhóm.");
  }
}

onMounted(() => {
  // console.log(
  //   "Modal groupOrder:",
  //   JSON.parse(JSON.stringify(props.groupOrder))
  // );
  // console.log("Modal members:", JSON.parse(JSON.stringify(props.members)));

  $socket.on("member-left", (payload) => {
    // Nếu chính user hiện tại rời nhóm
    if (
      payload.userId === auth.user?.id &&
      payload.conversationId === conversation.value?.id
    ) {
      // Đóng chatbox
      showChat.value = false;
    } else if (payload.conversationId === conversation.value?.id) {
      // Với người khác trong nhóm, hiển thị thông báo trong chat
      messages.value.push({
        type: "system",
        content: payload.message,
        createdAt: new Date(),
      });
    }
  });
});
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.25s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

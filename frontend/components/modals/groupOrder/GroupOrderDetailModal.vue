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
        class="flex-1 overflow-y-auto p-5 space-y-4 text-sm text-gray-700 tab-content relative"
      >
        <!-- State 1: Loading Initial Data (No data yet) -->
        <div
          v-if="loading && !groupOrder"
          class="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center space-y-3 animate-fade-in"
        >
          <div
            class="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin"
          ></div>
          <p class="text-sm font-medium text-gray-600">Đang tải dữ liệu...</p>
        </div>

        <!-- State 2: Data Available (Stale-while-revalidate allowed) -->
        <div v-else-if="groupOrder">
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
                        100,
                      ) + '%',
                  }"
                ></div>
              </div>
            </div>

            <!-- Danh sách thành viên -->
            <div class="mt-4 space-y-3">
              <div
                v-for="m in members"
                :key="m.userId || m.id"
                class="flex items-start gap-3 p-2 border border-gray-100 rounded-lg hover:bg-gray-50"
              >
                <UserCircleIcon
                  class="w-8 h-8 text-gray-400 mt-0.5 cursor-pointer hover:opacity-80 transition"
                  @click="goToUserProfile(m.userId || m.id)"
                />
                <div class="flex-1 space-y-1">
                  <div class="flex items-center justify-between gap-2">
                    <div>
                      <p
                        class="font-medium text-gray-800 cursor-pointer hover:underline hover:text-blue-600 transition"
                        @click="goToUserProfile(m.userId || m.id)"
                      >
                        {{
                          (m.userId || m.id) === auth.user?.id
                            ? "Bạn"
                            : m.fullName
                        }}
                      </p>
                      <p class="text-xs text-gray-500">{{ memberRole(m) }}</p>
                    </div>

                    <!-- Tóm tắt số lượng đã chọn -->
                    <p
                      v-if="m.hasChosen && m.items?.length"
                      class="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                    >
                      Đã chọn
                      {{ m.items.reduce((sum, i) => sum + (i.quantity || 0), 0) }}
                      sản phẩm
                    </p>
                    <p v-else class="text-xs text-gray-400 whitespace-nowrap">
                      Chưa chọn sản phẩm
                    </p>
                  </div>

                  <!-- Danh sách biến thể + số lượng đã chọn -->
                  <div
                    v-if="m.hasChosen && m.items?.length"
                    class="mt-1 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100"
                  >
                    <p class="text-xs font-medium text-gray-600 mb-1">
                      Chi tiết lựa chọn:
                    </p>
                    <ul
                      class="space-y-1 max-h-28 overflow-y-auto pr-1 text-xs text-gray-700"
                    >
                      <li
                        v-for="item in m.items"
                        :key="item.variantId"
                        class="flex items-center justify-between gap-2"
                      >
                        <div class="flex items-center gap-2 min-w-0">
                          <span
                            class="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"
                          />
                          <span class="truncate">
                            <span class="font-medium">
                              {{ item.colorName || "Màu không xác định" }}
                            </span>
                            <span v-if="item.sizeName" class="text-gray-500">
                              · Size {{ item.sizeName }}
                            </span>
                          </span>
                        </div>
                        <span class="font-semibold text-gray-900 flex-shrink-0">
                          x{{ item.quantity }}
                        </span>
                      </li>
                    </ul>
                  </div>
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
              v-if="
                auth.isCustomer &&
                (groupOrder.status === 'pending' ||
                  groupOrder.status === 'completed' ||
                  groupOrder.status === 'cancelled')
              "
              class="mt-5 flex justify-center gap-3"
            >
              <button
                @click="leaveGroup"
                :disabled="actionLoading"
                class="px-5 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl shadow-sm transition flex items-center justify-center min-w-[120px]"
              >
                <span v-if="actionLoading" class="loader-white mr-2"></span>
                <span>{{ actionLoading ? "Đang rời..." : "Rời nhóm" }}</span>
              </button>

              <!-- Nút giải tán nhóm (Dành cho Trưởng nhóm) -->
              <button
                v-if="auth.user?.id === groupOrder.creatorId"
                @click="disbandGroup"
                :disabled="actionLoading"
                class="px-5 py-2 bg-gray-800 hover:bg-black text-white font-semibold rounded-xl shadow-sm transition flex items-center justify-center min-w-[140px]"
              >
                <span v-if="actionLoading" class="loader-white mr-2"></span>
                <span>{{
                  actionLoading ? "Đang xử lý..." : "Giải tán nhóm"
                }}</span>
              </button>
            </div>

            <div
              v-else-if="auth.isCustomer && groupOrder.status === 'locked'"
              class="mt-5 flex justify-center gap-3"
            >
              <!-- Nút giải tán nhóm (Dành cho Trưởng nhóm) -->
              <button
                v-if="auth.user?.id === groupOrder.creatorId"
                @click="disbandGroup"
                :disabled="actionLoading"
                class="px-5 py-2 bg-gray-800 hover:bg-black text-white font-semibold rounded-xl shadow-sm transition flex items-center justify-center min-w-[140px]"
              >
                <span v-if="actionLoading" class="loader-white mr-2"></span>
                <span>{{
                  actionLoading ? "Đang xử lý..." : "Giải tán nhóm"
                }}</span>
              </button>
            </div>

            <!-- Thông tin khác -->
            <div class="mt-4 text-xs text-gray-500 text-right space-y-1">
              <p class="italic text-blue-400">
                Chỉ có thể rời nhóm khi nhóm đang mở, đã hoàn tất hoặc đã huỷ.
              </p>
              <p class="italic text-gray-500">
                Trưởng nhóm có quyền giải tán nhóm khi chưa đặt đơn hoặc sau khi
                hủy đơn
              </p>
            </div>
          </template>

          <!-- TAB 2: Sản phẩm -->
          <template v-else>
            <div class="flex flex-col items-center space-y-3">
              <img
                :src="product.thumbnailUrl"
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

            <!-- Nút đổi sản phẩm, chỉ trưởng nhóm mới thấy -->
            <div
              v-if="
                auth.isCustomer &&
                auth.user?.id === groupOrder.creatorId &&
                (groupOrder.status === 'pending' ||
                  groupOrder.status === 'locked')
              "
              class="mt-4 flex justify-center"
            >
              <button
                @click="emit('open-select-product')"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition"
              >
                Đổi sản phẩm mua chung
              </button>
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
                Số tiền giảm:
                <strong>
                  {{
                    coupon.type === "percent"
                      ? coupon.value + "%"
                      : formatPrice(coupon.value)
                  }}
                </strong>
              </p>

              <!-- đơn tối thiểu -->
              <p v-if="coupon.minOrderTotal" class="text-gray-600">
                Đơn tối thiểu: {{ formatPrice(coupon.minOrderTotal) }}/người
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
              <!-- chữ in nghiêng màu đỏ -->
              <p class="italic text-red-600">
                Lưu ý: Hãy đặt hàng trước khi hết hạn mã giảm giá!
              </p>
            </div>
          </template>
        </div>

        <!-- State 3: No Data State (Not loading and no groupOrder) -->
        <div
          v-else-if="!loading && !groupOrder"
          class="flex flex-col items-center justify-center py-10 space-y-3"
        >
          <InformationCircleIcon class="w-12 h-12 text-gray-300" />
          <p class="text-sm font-medium text-gray-500">
            Không tìm thấy thông tin nhóm.
          </p>
          <button
            @click="$emit('close')"
            class="text-xs text-blue-600 hover:underline"
          >
            Quay lại
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import {
  UserCircleIcon,
  UserPlusIcon,
  InformationCircleIcon,
} from "@heroicons/vue/24/outline";
import { useAuthStore } from "@/stores/auth";

const props = defineProps({
  open: Boolean,
  loading: Boolean,
  groupOrder: Object,
  product: Object,
  coupon: Object,
  members: Array,
  inviteToken: String,
});

const actionLoading = ref(false);

const emit = defineEmits(["close", "leave-success", "open-select-product"]);
const auth = useAuthStore();
const router = useRouter();
const { $socket } = useNuxtApp();

function goToUserProfile(userId) {
  if (userId && userId !== "00000000-0000-0000-0000-000000000000") {
    emit("close");
    router.push(`/feed/${userId}`);
  }
}

const tabs = ["Thành viên nhóm", "Sản phẩm mua chung"];
const activeTab = ref("Thành viên nhóm");
const showInvite = ref(false);

const fullInviteLink = computed(() =>
  props.inviteToken
    ? `${window.location.origin}/invite/${props.inviteToken}`
    : null,
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

  actionLoading.value = true;
  try {
    const res = await $fetch(`/group-orders/${props.groupOrder.id}/leave`, {
      method: "PATCH",
      baseURL: useRuntimeConfig().public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    alert("Đã rời nhóm thành công.");
    emit("leave-success");
  } catch (err) {
    console.error("Lỗi rời nhóm:", err);
    alert(err?.data?.error || "Không thể rời nhóm.");
  } finally {
    actionLoading.value = false;
    // Luôn đóng modal
    emit("close");
  }
}

async function disbandGroup() {
  const ok = confirm(
    "Bạn có chắc chắn muốn giải tán nhóm này không?\nHành động này không thể hoàn tác và tất cả thành viên sẽ bị mời ra khỏi nhóm!",
  );
  if (!ok) return;

  actionLoading.value = true;
  try {
    const res = await $fetch(`/group-orders/${props.groupOrder.id}/disband`, {
      method: "DELETE",
      baseURL: useRuntimeConfig().public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    alert(res.message || "Đã giải tán nhóm thành công.");
    emit("leave-success"); // Kích hoạt văng ra khỏi chat
  } catch (err) {
    console.error("Lỗi giải tán nhóm:", err);
    alert(err?.data?.error || "Không thể giải tán nhóm lúc này.");
  } finally {
    actionLoading.value = false;
    // Đóng UI modal
    emit("close");
  }
}
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

.loader-white {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
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

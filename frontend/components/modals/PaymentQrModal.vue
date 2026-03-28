<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
  >
    <div
      class="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-[95%] sm:max-w-md flex flex-col items-center shadow-2xl max-h-[90vh] overflow-y-auto border border-gray-100"
    >
      <!-- Loading tạo link -->
      <div v-if="creating" class="flex flex-col items-center py-8">
        <span class="animate-spin text-3xl mb-3">⏳</span>
        <p class="text-sm text-gray-500">Đang tạo link thanh toán...</p>
      </div>

      <!-- Lỗi -->
      <div v-else-if="error" class="flex flex-col items-center py-6">
        <span class="text-3xl mb-3">❌</span>
        <p class="text-sm text-red-600 text-center mb-3">{{ error }}</p>
        <button
          @click="close"
          class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Đóng
        </button>
      </div>

      <!-- PayPal QR -->
      <template v-else-if="method === 'PAYPAL' && qrUrl">
        <img
          src="https://www.paypalobjects.com/webstatic/icon/pp258.png"
          class="h-8 mb-2"
        />
        <h3 class="text-lg font-semibold mb-1 text-yellow-700">
          Quét mã QR PayPal
        </h3>
        <p class="text-xs text-gray-500 mb-3 text-center">
          Quét mã QR bằng app PayPal trên điện thoại.<br />
          Trang sẽ tự cập nhật khi thanh toán xong.
        </p>

        <!-- Hiển thị thông tin thanh toán (Group hoặc Cá nhân chi tiết) -->
        <div
          v-if="(isGroupPayment && groupProduct) || (!isGroupPayment && individualOrder)"
          class="w-full bg-blue-50 rounded-lg p-3 mb-3 max-h-64 overflow-y-auto"
        >
          <!-- Product Header for Group Order -->
          <div
            v-if="isGroupPayment && groupProduct"
            class="flex items-center gap-2 mb-3 pb-2 border-b border-blue-200"
          >
            <img
              v-if="groupProduct.thumbnailUrl"
              :src="groupProduct.thumbnailUrl"
              :alt="groupProduct.name"
              class="w-12 h-12 object-cover rounded"
            />
            <div class="flex-1 min-w-0">
              <h4 class="font-semibold text-sm text-gray-800 truncate">
                {{ groupProduct.name }}
              </h4>
              <p class="text-xs text-gray-500">{{ memberCount }} thành viên</p>
            </div>
          </div>

          <!-- Header for Individual Order -->
          <div
            v-else
            class="mb-3 pb-2 border-b border-blue-200"
          >
            <h4 class="font-semibold text-sm text-gray-800">
              Thông tin đơn hàng #{{ (individualOrder?.id || '') }}
            </h4>
          </div>

          <!-- Member Details (Group) -->
          <div v-if="isGroupPayment" class="space-y-2 mb-3">
            <div
              v-for="(member, idx) in groupMemberDetails"
              :key="idx"
              class="bg-white rounded p-2 text-xs"
            >
              <div class="font-semibold text-gray-700 mb-1">
                {{ member.fullName }}
              </div>
              <div
                v-for="(item, itemIdx) in member.items"
                :key="itemIdx"
                class="flex justify-between items-center text-gray-600 ml-2"
              >
                <div class="flex items-center gap-2">
                  <img
                    v-if="item.colorImageUrl"
                    :src="item.colorImageUrl"
                    :alt="item.colorName"
                    class="w-4 h-4 object-cover rounded-full border"
                  />
                  <span
                    >{{ item.colorName || "N/A" }} •
                    {{ item.sizeName || "N/A" }} × {{ item.quantity }}</span
                  >
                </div>
                <span class="font-medium"
                  >{{ (item.total || 0).toLocaleString("vi-VN") }}đ</span
                >
              </div>
              <!-- <div
                class="flex justify-between mt-1 pt-1 border-t border-gray-100 text-[10px] text-gray-500"
              >
                <span>Tạm tính:</span>
                <span>{{ (member.subtotal || 0).toLocaleString("vi-VN") }}đ</span>
              </div> -->
              <div
                v-if="member.discount > 0"
                class="flex justify-between text-[10px] text-green-600"
              >
                <span>Giảm giá:</span>
                <span>-{{ (member.discount || 0).toLocaleString("vi-VN") }}đ</span>
              </div>
              <div
                v-if="member.shippingFee > 0"
                class="flex justify-between text-[10px] text-gray-500"
              >
                <span>Phí ship:</span>
                <span>+{{ (member.shippingFee || 0).toLocaleString("vi-VN") }}đ</span>
              </div>
              <div
                class="flex justify-between mt-0.5 pt-0.5 border-t border-gray-200 font-semibold text-gray-700"
              >
                <span>Tổng:</span>
                <span>{{ (member.total || 0).toLocaleString("vi-VN") }}đ</span>
              </div>
            </div>
          </div>

          <!-- Member Details (Individual) -->
          <div v-else class="space-y-2 mb-3">
            <div
              v-for="(item, idx) in individualItems"
              :key="idx"
              class="bg-white rounded p-2 text-xs border border-gray-100 flex items-center gap-3"
            >
              <img
                v-if="item.imageUrl"
                :src="item.imageUrl"
                class="w-10 h-10 object-cover rounded"
              />
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-gray-800 truncate">{{ item.productName }}</div>
                <div class="text-gray-500 text-[10px]">{{ item.variantName }} × {{ item.quantity }}</div>
              </div>
              <div class="font-medium text-gray-700">
                {{ (item.price * item.quantity).toLocaleString("vi-VN") }}đ
              </div>
            </div>
          </div>

          <!-- Subtotal and Total block -->
          <div class="space-y-1 pt-2 border-t border-blue-300">
            <div
              v-if="effectiveSubtotal > 0"
              class="flex justify-between text-sm text-gray-600"
            >
              <span>Tạm tính:</span>
              <span>{{ (effectiveSubtotal).toLocaleString("vi-VN") }} VNĐ</span>
            </div>
            <div
              v-if="effectiveDiscount > 0"
              class="flex justify-between text-sm text-green-600"
            >
              <span>Giảm giá:</span>
              <span
                >-{{
                  effectiveDiscount.toLocaleString("vi-VN")
                }}
                VNĐ</span
              >
            </div>
            <div
              v-if="effectiveShipping > 0"
              class="flex justify-between text-sm text-gray-600"
            >
              <span>Phí ship:</span>
              <span>+{{ effectiveShipping.toLocaleString("vi-VN") }} VNĐ</span>
            </div>
            <div
              class="flex justify-between font-bold text-blue-700 pt-1 border-t border-blue-400"
            >
              <span>TỔNG THANH TOÁN:</span>
              <span class="text-base"
                >{{ paymentAmount.toLocaleString("vi-VN") }} VNĐ</span
              >
            </div>
          </div>
        </div>
        <img
          :src="qrUrl"
          alt="PayPal QR"
          class="w-40 h-40 sm:w-48 sm:h-48 mb-3 border rounded-lg shadow-sm opacity-90 hover:opacity-100 transition duration-300"
        />
        <div class="flex items-center gap-2 text-xs text-gray-400 mb-2">
          <span class="animate-spin">⏳</span> Đang chờ thanh toán...
        </div>
        <a
          :href="approvalUrl"
          target="_blank"
          class="text-blue-600 underline mb-3 text-sm"
        >
          Hoặc bấm vào đây để thanh toán
        </a>
        <button
          @click="close"
          class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
        >
          Đóng
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from "@/stores/auth";

const props = defineProps({
  /** Hiển thị modal */
  open: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "paid"]);

const config = useRuntimeConfig();
const auth = useAuthStore();

// internal state
const visible = ref(false);
const creating = ref(false);
const error = ref("");
const method = ref(""); // PAYPAL | MOMO | VNPAY
const qrUrl = ref("");
const approvalUrl = ref("");
const paypalOrderId = ref("");
const dbOrderId = ref("");
let pollingTimer = null;

// === Group Order state ===
const isGroupPayment = ref(false);
const groupOrderId = ref("");
const paymentAmount = ref(0);
const memberCount = ref(0);
const groupProduct = ref(null);
const groupMemberDetails = ref([]);
const groupCoupon = ref(null);
const totalBeforeDiscount = ref(0);
const totalShippingFee = ref(0);

// === Individual Order state ===
const individualOrder = ref(null);
const individualItems = ref([]);

// Derived values for summary block
const effectiveSubtotal = computed(() => {
  if (isGroupPayment.value) return totalBeforeDiscount.value;
  return Number(individualOrder.value?.subtotal) || 0;
});
const effectiveDiscount = computed(() => {
  if (isGroupPayment.value) return groupCoupon.value?.discountAmount || 0;
  return Number(individualOrder.value?.discountTotal) || 0;
});
const effectiveShipping = computed(() => {
  if (isGroupPayment.value) return totalShippingFee.value;
  return Number(individualOrder.value?.shippingFee) || 0;
});

// Public method: bắt đầu thanh toán cho 1 đơn hàng
const startPayment = async ({ order, items, paymentMethod }) => {
  // Support both old signature (orderId, amount, paymentMethod) and new (order object)
  const isObject = typeof order === "object";
  const actualOrderId = isObject ? order.id : order;
  const actualAmount = isObject ? order.total : items;
  const actualMethod = isObject ? paymentMethod : arguments[0].paymentMethod;

  // Reset state
  creating.value = true;
  error.value = "";
  qrUrl.value = "";
  approvalUrl.value = "";
  paypalOrderId.value = "";
  dbOrderId.value = actualOrderId;
  method.value = actualMethod;
  visible.value = true;
  isGroupPayment.value = false;
  paymentAmount.value = Number(actualAmount);
  memberCount.value = 0;

  if (isObject) {
    individualOrder.value = order;
    individualItems.value = items || [];
  } else {
    individualOrder.value = null;
    individualItems.value = [];
  }

  try {
    if (actualMethod === "PAYPAL") {
      await createPaypal(actualOrderId, actualAmount);
    } else if (actualMethod === "MOMO") {
      await createMomo(actualOrderId, actualAmount);
    } else if (actualMethod === "VNPAY") {
      await createVnpay(actualOrderId, actualAmount);
    } else {
      error.value = "Phương thức thanh toán không hỗ trợ";
    }
  } catch (e) {
    console.error("Payment create error:", e);
    error.value = e?.data?.error || e?.message || "Lỗi tạo link thanh toán";
  } finally {
    creating.value = false;
  }
};

// New method: bắt đầu thanh toán cho group order
const startGroupPayment = async ({
  groupOrderId: gId,
  amount,
  paymentMethod,
  memberCount: mCount = 0,
  product = null,
  memberDetails = [],
  coupon = null,
  totalBeforeDiscount: tbd = 0,
  totalShippingFee: tsf = 0,
}) => {
  // Reset state
  creating.value = true;
  error.value = "";
  qrUrl.value = "";
  approvalUrl.value = "";
  paypalOrderId.value = "";
  groupOrderId.value = gId;
  method.value = paymentMethod;
  visible.value = true;
  isGroupPayment.value = true;
  paymentAmount.value = amount;
  memberCount.value = mCount;
  groupProduct.value = product;
  groupMemberDetails.value = memberDetails;
  groupCoupon.value = coupon;
  totalBeforeDiscount.value = tbd;
  totalShippingFee.value = tsf;

  try {
    if (paymentMethod === "PAYPAL") {
      await createGroupPaypal(gId, amount);
    } else {
      error.value = "Group payment chỉ hỗ trợ PayPal";
    }
  } catch (e) {
    console.error("Group payment create error:", e);
    error.value = e?.data?.error || e?.message || "Lỗi tạo link thanh toán";
  } finally {
    creating.value = false;
  }
};

// === PayPal ===
const createPaypal = async (orderId, amount) => {
  const res = await $fetch("/payment/paypal/create", {
    method: "POST",
    baseURL: config.public.apiBase,
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    body: { orderId, amount: Math.round(amount) },
  });

  if (!res.qrUrl || !res.approvalUrl) {
    throw new Error("Không nhận được link thanh toán từ PayPal");
  }

  qrUrl.value = res.qrUrl;
  approvalUrl.value = res.approvalUrl;
  paypalOrderId.value = res.paypalOrderId || "";

  // Bắt đầu polling
  startPolling(orderId);
};

// === PayPal for Group Order ===
const createGroupPaypal = async (groupOrderId, amount) => {
  const res = await $fetch("/payment/group-order/paypal/create", {
    method: "POST",
    baseURL: config.public.apiBase,
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    body: { groupOrderId, amount: Math.round(amount) },
  });

  if (!res.qrUrl || !res.approvalUrl) {
    throw new Error("Không nhận được link thanh toán từ PayPal");
  }

  qrUrl.value = res.qrUrl;
  approvalUrl.value = res.approvalUrl;
  paypalOrderId.value = res.paypalOrderId || "";

  // Bắt đầu polling cho group order
  startGroupPolling(groupOrderId);
};

// === MoMo (redirect) ===
const createMomo = async (orderId, amount) => {
  const res = await $fetch("/payment/momo/create", {
    method: "POST",
    baseURL: config.public.apiBase,
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    body: {
      orderId,
      amount: Math.round(amount),
      redirectUrl: window.location.href,
    },
  });

  if (res.paymentUrl) {
    window.location.href = res.paymentUrl;
  } else {
    throw new Error("Không nhận được link thanh toán từ MoMo");
  }
};

// === VNPay (redirect) ===
const createVnpay = async (orderId, amount) => {
  const res = await $fetch("/payment/vnpay/create", {
    method: "POST",
    baseURL: config.public.apiBase,
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    body: { orderId, amount: Math.round(amount) },
  });

  if (res.paymentUrl) {
    window.location.href = res.paymentUrl;
  } else {
    throw new Error("Không nhận được link thanh toán từ VNPay");
  }
};

// === Polling ===
// === Polling ===
const startPolling = (orderId) => {
  stopPolling();
  pollingTimer = setInterval(async () => {
    try {
      // Check if modal is still visible, stop polling if closed
      if (!visible.value) {
        console.log("Modal closed, stopping polling");
        stopPolling();
        return;
      }

      const queryParams = paypalOrderId.value
        ? `?paypalOrderId=${paypalOrderId.value}`
        : "";

      console.log(`Checking payment status for order ${orderId}...`);

      const statusRes = await $fetch(
        `/payment/paypal/check-status/${orderId}${queryParams}`,
        { baseURL: config.public.apiBase },
      );

      console.log(`Payment status response:`, statusRes);

      if (statusRes.isPaid) {
        console.log("Payment confirmed, stopping polling and closing modal");
        stopPolling();
        visible.value = false;
        emit("paid", { orderId, paymentMethod: method.value });
      }
    } catch (e) {
      console.warn("Polling error:", e);
      // Don't stop polling on error, continue checking
    }
  }, 3000);
};

// === Group Order Polling ===
const startGroupPolling = (groupOrderId) => {
  stopPolling();
  console.log(`Starting group order polling for ${groupOrderId}`);

  pollingTimer = setInterval(async () => {
    try {
      // Check if modal is still visible, stop polling if closed
      if (!visible.value) {
        console.log("Modal closed, stopping polling");
        stopPolling();
        return;
      }

      const queryParams = paypalOrderId.value
        ? `?paypalOrderId=${paypalOrderId.value}`
        : "";

      console.log(
        `[Poll] Checking group order payment status for ${groupOrderId} with PayPal order ${paypalOrderId.value}...`,
      );

      const statusRes = await $fetch(
        `/payment/group-order/paypal/check-status/${groupOrderId}${queryParams}`,
        {
          baseURL: config.public.apiBase,
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        },
      );

      console.log(`[Poll] Group order payment status response:`, statusRes);

      if (statusRes.isPaid === true) {
        console.log(
          "[Poll] ✅ Payment CONFIRMED! Stopping polling, closing modal, emitting paid event",
        );
        stopPolling();
        visible.value = false;
        emit("paid", { groupOrderId, paymentMethod: method.value });
      } else {
        console.log(
          "[Poll] ⏳ Payment not yet confirmed, continuing polling...",
        );
      }
    } catch (e) {
      console.error("[Poll] Group polling error:", e);
      // Don't stop polling on error, continue checking
    }
  }, 3000);
};

const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
};

const close = () => {
  stopPolling();
  visible.value = false;
  emit("close");
  console.log("Payment modal closed");
};

onUnmounted(() => {
  stopPolling();
  console.log("PaymentQrModal unmounted, polling stopped");
});

// Watch 'open' prop to sync with internal visible state
watch(
  () => props.open,
  (newOpen) => {
    if (newOpen) {
      visible.value = true;
    } else {
      visible.value = false;
      stopPolling();
      console.log("Modal closed via prop, polling stopped");
    }
  },
);

// Expose cho parent gọi
defineExpose({ startPayment, startGroupPayment });
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
  >
    <div
      class="bg-white rounded-xl p-6 max-w-sm w-full flex flex-col items-center shadow-2xl"
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
        <img
          :src="qrUrl"
          alt="PayPal QR"
          class="w-48 h-48 mb-3 border rounded"
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

// Public method: bắt đầu thanh toán cho 1 đơn hàng
const startPayment = async ({ orderId, amount, paymentMethod }) => {
  // Reset state
  creating.value = true;
  error.value = "";
  qrUrl.value = "";
  approvalUrl.value = "";
  paypalOrderId.value = "";
  dbOrderId.value = orderId;
  method.value = paymentMethod;
  visible.value = true;

  try {
    if (paymentMethod === "PAYPAL") {
      await createPaypal(orderId, amount);
    } else if (paymentMethod === "MOMO") {
      await createMomo(orderId, amount);
    } else if (paymentMethod === "VNPAY") {
      await createVnpay(orderId, amount);
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
const startPolling = (orderId) => {
  stopPolling();
  pollingTimer = setInterval(async () => {
    try {
      const queryParams = paypalOrderId.value
        ? `?paypalOrderId=${paypalOrderId.value}`
        : "";
      const statusRes = await $fetch(
        `/payment/paypal/check-status/${orderId}${queryParams}`,
        { baseURL: config.public.apiBase },
      );

      if (statusRes.isPaid) {
        stopPolling();
        visible.value = false;
        emit("paid", { orderId, paymentMethod: method.value });
      }
    } catch (e) {
      console.warn("Polling error:", e);
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
};

onUnmounted(() => {
  stopPolling();
});

// Expose cho parent gọi
defineExpose({ startPayment });
</script>

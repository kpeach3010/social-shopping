<template>
  <div v-if="open" class="fixed inset-0 flex items-center justify-center z-50">
    <!-- Overlay -->
    <div
      class="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
      @click="$emit('close')"
    ></div>

    <!-- Modal -->
    <div
      class="relative bg-white rounded-2xl shadow-2xl w-[420px] overflow-hidden flex flex-col z-10 animate-fade-in"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-6 py-4 border-b border-gray-200"
      >
        <h2 class="text-lg font-semibold text-gray-800">
          Chọn phương thức thanh toán
        </h2>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600 transition"
        >
          ✕
        </button>
      </div>

      <!-- Content -->
      <div class="p-6">
        <p class="text-sm text-gray-600 mb-6">
          Bạn có muốn thanh toán trực tuyến ngay hoặc chọn thanh toán khi nhận
          hàng?
        </p>

        <div class="space-y-3">
          <button
            @click="selectMethod('PAYPAL')"
            :disabled="onlineLoading"
            class="w-full px-4 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
          >
            <span v-if="onlineLoading" class="loader mr-2"></span>
            {{ onlineLoading ? "Đang xử lý..." : "Thanh toán trực tuyến" }}
          </button>

          <button
            @click="selectMethod('COD')"
            :disabled="codLoading"
            class="w-full px-4 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
          >
            <span v-if="codLoading" class="loader mr-2"></span>
            {{
              codLoading ? "Đang xử lý..." : "Thanh toán khi nhận hàng (COD)"
            }}
          </button>

          <button
            @click="$emit('close')"
            :disabled="onlineLoading || codLoading"
            class="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition disabled:bg-gray-100 text-sm font-medium"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close", "select"]);

const onlineLoading = ref(false);
const codLoading = ref(false);

const selectMethod = async (method) => {
  try {
    if (method === "PAYPAL") {
      onlineLoading.value = true;
    } else {
      codLoading.value = true;
    }

    emit("select", method);

    // Close modal after a short delay to show loading state
    setTimeout(() => {
      emit("close");
    }, 100);
  } catch (error) {
    console.error("Payment method selection error:", error);
  } finally {
    if (method === "PAYPAL") {
      onlineLoading.value = false;
    } else {
      codLoading.value = false;
    }
  }
};

// Reset loading states when modal closes
watch(
  () => props.open,
  (newValue) => {
    if (!newValue) {
      onlineLoading.value = false;
      codLoading.value = false;
    }
  },
);
</script>

<style scoped>
.loader {
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.animate-fade-in {
  animation: fade-in 0.15s ease-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>

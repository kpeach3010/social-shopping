<template>
  <div v-if="open" class="fixed inset-0 flex items-center justify-center z-50">
    <!-- Overlay mờ nền -->
    <div
      class="absolute inset-0 bg-black/20 backdrop-blur-sm"
      @click="$emit('close')"
    ></div>

    <!-- Popup -->
    <div
      class="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto p-4 z-10"
    >
      <h2 class="text-lg font-semibold mb-4">Chọn mã giảm giá</h2>

      <!-- Loading -->
      <div v-if="loading" class="flex flex-col items-center py-8 gap-3 text-gray-400">
        <svg class="animate-spin w-7 h-7" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        <span class="text-sm">Đang tải mã giảm giá...</span>
      </div>

      <!-- Không có coupon (sau khi đã load xong) -->
      <div v-else-if="!personalCoupons.length" class="text-gray-500 text-sm">
        Không có coupon nào khả dụng.
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="c in personalCoupons"
          :key="c.id"
          @click="!isDisabled(c) && $emit('select', c)"
          class="p-3 border rounded-md transition bg-white max-w-sm relative"
          :class="
            isDisabled(c)
              ? 'opacity-50 cursor-not-allowed border-gray-200'
              : 'hover:shadow-md hover:border-black/20 cursor-pointer'
          "
        >
          <!-- Code + giá trị -->
          <p class="text-base font-bold text-gray-800">
            {{ c.code }}
            <span v-if="c.type === 'percent'" class="text-gray-800">
              – {{ c.value }}%</span
            >
            <span v-else class="text-gray-800">
              – {{ formatPrice(c.value) }}</span
            >
          </p>

          <!-- loại mã -->
          <p
            class="text-xs font-medium mt-1"
            :class="c.kind === 'general' ? 'text-green-600' : 'text-blue-600'"
          >
            {{
              c.kind === "general" ? "Mã áp dụng cá nhân" : "Mã áp dụng nhóm"
            }}
          </p>

          <!-- mô tả -->
          <p v-if="c.description" class="text-xs text-gray-500 mt-1">
            {{ c.description }}
          </p>

          <!-- điều kiện đơn tối thiểu -->
          <p v-if="c.minOrderTotal" class="text-xs mt-1"
            :class="isDisabled(c) ? 'text-red-400 font-medium' : 'text-gray-500'"
          >
            Đơn tối thiểu:
            <span class="font-semibold">{{ formatPrice(c.minOrderTotal) }}</span>
            <span v-if="isDisabled(c)" class="ml-1">— Chưa đủ điều kiện</span>
          </p>

          <!-- số lượt mỗi người -->
          <p v-if="c.perUserLimit" class="text-xs text-gray-500">
            Giới hạn mỗi người:
            <span class="font-medium">{{ c.perUserLimit }}</span> lần
          </p>

          <p v-if="c.userUsedCount !== undefined" class="text-xs text-gray-500">
            Bạn đã sử dụng:
            <span class="font-medium">{{ c.userUsedCount }}</span> lần
          </p>

          <!-- ngày hết hạn -->
          <p v-if="c.endsAt" class="text-xs text-red-500 mt-1">
            Hết hạn: {{ formatDate(c.endsAt) }}
          </p>
        </div>
      </div>

      <div class="mt-4 text-right">
        <button
          @click="$emit('close')"
          class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Đóng
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  open: Boolean,
  loading: { type: Boolean, default: false },
  coupons: { type: Array, default: () => [] },
  subtotal: { type: Number, default: 0 },
});

const formatPrice = (v) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    v || 0
  );

// Coupon bị mờ khi đơn chưa đủ giá trị tối thiểu
const isDisabled = (c) =>
  !!c.minOrderTotal && props.subtotal < Number(c.minOrderTotal);

const personalCoupons = computed(() =>
  props.coupons.filter((c) => c.kind === "general")
);

const formatDate = (d) => {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("vi-VN");
  } catch {
    return d;
  }
};
</script>

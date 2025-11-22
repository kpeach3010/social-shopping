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

      <div v-if="!coupons?.length" class="text-gray-500 text-sm">
        Không có coupon nào khả dụng.
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="c in personalCoupons"
          :key="c.id"
          @click="$emit('select', c)"
          class="p-3 border rounded-md hover:shadow-md hover:border-black/20 cursor-pointer transition bg-white max-w-sm"
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
          <p v-if="c.minOrderTotal" class="text-xs text-gray-500 mt-1">
            Đơn tối thiểu:
            <span class="font-semibold">{{
              formatPrice(c.minOrderTotal)
            }}</span>
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
  coupons: { type: Array, default: () => [] },
});

const formatPrice = (v) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    v || 0
  );

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

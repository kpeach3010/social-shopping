<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center"
  >
    <div
      class="absolute inset-0 bg-black/30 backdrop-blur-sm"
      @click="close"
    ></div>

    <div
      class="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden z-10 border"
    >
      <div
        class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center"
      >
        <h2 class="text-lg font-semibold text-gray-800">
          Chi tiết mã giảm giá
        </h2>
        <button class="text-gray-400 hover:text-black text-xl" @click="close">
          ✕
        </button>
      </div>

      <div class="p-6 overflow-y-auto max-h-[70vh]">
        <div v-if="coupon" class="space-y-3">
          <div class="flex items-center justify-between py-2 border-b">
            <span class="text-sm text-gray-600">Loại mã</span>
            <span class="text-sm font-medium text-gray-900">
              {{ coupon.kind === "general" ? "Mã cá nhân" : "Mã nhóm" }}
            </span>
          </div>

          <div class="flex items-center justify-between py-2 border-b">
            <span class="text-sm text-gray-600">Mã giảm giá</span>
            <span class="text-sm font-medium text-gray-900 font-mono">
              {{ coupon.code }}
            </span>
          </div>

          <div class="flex items-center justify-between py-2 border-b">
            <span class="text-sm text-gray-600">Giảm giá</span>
            <span class="text-sm font-medium text-gray-900">
              <span v-if="coupon.type === 'percent'">{{ coupon.value }}%</span>
              <span v-else>{{ formatPrice(coupon.value) }}</span>
            </span>
          </div>

          <div class="flex items-center justify-between py-2 border-b">
            <span class="text-sm text-gray-600">Mô tả</span>
            <span class="text-sm font-medium text-gray-900 text-right max-w-xs">
              {{ coupon.description || "Không có mô tả" }}
            </span>
          </div>

          <div class="flex items-center justify-between py-2 border-b">
            <span class="text-sm text-gray-600">Đơn hàng tối thiểu</span>
            <span class="text-sm font-medium text-gray-900">
              {{ formatPrice(coupon.minOrderTotal) }}
            </span>
          </div>

          <div class="flex items-center justify-between py-2 border-b">
            <span class="text-sm text-gray-600">Thời gian áp dụng</span>
            <span class="text-sm font-medium text-gray-900 text-right">
              {{ formatDate(coupon.startsAt) }} -
              {{ formatDate(coupon.endsAt) }}
            </span>
          </div>

          <div
            v-if="coupon.kind === 'group'"
            class="flex items-center justify-between py-2 border-b"
          >
            <span class="text-sm text-gray-600">Số thành viên tối đa</span>
            <span class="text-sm font-medium text-gray-900">
              {{ coupon.maxMember }} người
            </span>
          </div>

          <div
            v-if="coupon.usage_limit"
            class="flex items-center justify-between py-2 border-b"
          >
            <span class="text-sm text-gray-600">Tổng lượt dùng</span>
            <span class="text-sm font-medium text-gray-900">
              {{ coupon.used || 0 }} / {{ coupon.usage_limit }} lượt
            </span>
          </div>

          <div
            v-if="coupon.perUserLimit"
            class="flex items-center justify-between py-2 border-b"
          >
            <span class="text-sm text-gray-600">Giới hạn mỗi người</span>
            <span class="text-sm font-medium text-gray-900">
              {{ coupon.perUserLimit }} lần
            </span>
          </div>

          <div class="flex items-center justify-between py-2">
            <span class="text-sm text-gray-600">Bạn đã sử dụng</span>
            <span class="text-sm font-medium text-gray-900">
              {{ coupon.userUsedCount || 0 }} lần
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  isOpen: Boolean,
  coupon: Object,
});

const emit = defineEmits(["close"]);

const close = () => {
  emit("close");
};

const formatPrice = (v) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    v || 0
  );

const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};
</script>

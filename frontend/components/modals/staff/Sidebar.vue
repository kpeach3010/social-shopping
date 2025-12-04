<script setup>
import {
  Shirt,
  BadgePercent,
  ShoppingBag,
  BarChart,
  ChartBarStacked,
} from "lucide-vue-next";
const props = defineProps({
  isOpen: { type: Boolean, default: true },
  showToggle: { type: Boolean, default: true },
});

const menu = [
  { to: "/staff/products", label: "Sản phẩm", icon: Shirt },
  { to: "/staff/category", label: "Danh mục sản phẩm", icon: ChartBarStacked },
  { to: "/staff/coupons", label: "Mã giảm giá", icon: BadgePercent },
  { to: "/staff/orders", label: "Đơn hàng", icon: ShoppingBag },
];
</script>
<template>
  <aside
    :class="[
      'bg-white border-r border-gray-200 shadow-sm flex flex-col transition-all duration-300',
      isOpen ? 'w-60' : 'w-16',
    ]"
  >
    <div class="flex items-center justify-between p-4">
      <h2 v-if="isOpen" class="text-xl font-bold">Quản lý cửa hàng</h2>
      <button
        v-if="showToggle"
        @click="$emit('toggle')"
        class="p-2 rounded hover:bg-gray-100"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
    </div>
    <nav class="flex-1 space-y-2 px-2">
      <NuxtLink
        v-for="item in menu"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-2 px-3 py-2 rounded font-medium transition"
        active-class="bg-gray-100 text-black"
      >
        <component :is="item.icon" class="w-5 h-5" />
        <span v-if="isOpen">{{ item.label }}</span>
      </NuxtLink>
    </nav>
  </aside>
</template>

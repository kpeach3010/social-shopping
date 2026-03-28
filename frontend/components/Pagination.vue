<template>
  <div class="flex flex-col items-center gap-2 mt-6">
    <div class="flex justify-center gap-2">
      <button
        class="px-3 py-1 rounded border hover:bg-gray-100 disabled:opacity-40"
        :disabled="currentPage === 1"
        @click="$emit('update:currentPage', currentPage - 1)"
      >
        ‹
      </button>
      <button
        v-for="p in pages"
        :key="p"
        class="px-3 py-1 rounded border transition-colors"
        :class="[
          currentPage === p ? 'bg-black text-white' : 'hover:bg-gray-100',
          p === '...' ? 'cursor-default border-transparent text-gray-400 hover:bg-transparent' : ''
        ]"
        :disabled="p === '...'"
        @click="p !== '...' && $emit('update:currentPage', p)"
      >
        {{ p }}
      </button>
      <button
        class="px-3 py-1 rounded border hover:bg-gray-100 disabled:opacity-40"
        :disabled="currentPage === totalPages"
        @click="$emit('update:currentPage', currentPage + 1)"
      >
        ›
      </button>
    </div>
    <div v-if="total > 0" class="text-sm text-gray-500 mt-2 font-medium">
      {{ startIdx + 1 }} - {{ endIdx }} / {{ total }}
    </div>
  </div>
</template>
<script setup>
import { computed } from "vue";
const props = defineProps({
  totalPages: { type: Number, required: true },
  currentPage: { type: Number, required: true },
  perPage: { type: Number, default: 10 },
  total: { type: Number, default: 0 },
});

const pages = computed(() => {
  const current = props.currentPage;
  const total = props.totalPages;
  const delta = 2; // Số trang hiển thị xung quanh trang hiện tại
  const range = [];
  const rangeWithDots = [];
  let l;

  for (let i = 1; i <= total; i++) {
    if (i == 1 || i == total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }

  for (let i of range) {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1);
      } else if (i - l !== 1) {
        rangeWithDots.push("...");
      }
    }
    rangeWithDots.push(i);
    l = i;
  }

  return rangeWithDots;
});

const startIdx = computed(() => (props.currentPage - 1) * props.perPage);
const endIdx = computed(() =>
  Math.min(props.currentPage * props.perPage, props.total)
);
</script>

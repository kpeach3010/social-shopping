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
        class="px-3 py-1 rounded border"
        :class="currentPage === p ? 'bg-black text-white' : 'hover:bg-gray-100'"
        @click="$emit('update:currentPage', p)"
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
    <div v-if="total > 0" class="text-sm text-gray-500 mt-1">
      Hiển thị {{ startIdx + 1 }}-{{ endIdx }} trên tổng {{ total }} mục
      <span v-if="perPage"> ({{ perPage }} / trang)</span>
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
const pages = computed(() =>
  Array.from({ length: props.totalPages }, (_, i) => i + 1)
);
const startIdx = computed(() => (props.currentPage - 1) * props.perPage);
const endIdx = computed(() =>
  Math.min(props.currentPage * props.perPage, props.total)
);
</script>

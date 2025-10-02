<script setup>
import { ref } from "vue";

const props = defineProps({
  categories: { type: Array, required: true },
  modelValue: { type: String, default: "" },
});

const emit = defineEmits(["update:modelValue"]);
const isOpen = ref(false);

const toggle = () => (isOpen.value = !isOpen.value);
const selectCategory = (id) => {
  emit("update:modelValue", id);
  isOpen.value = false;
};

// build tree đệ quy kèm level
const renderOptions = (list, level = 0) => {
  return list.map((c) => ({
    ...c,
    level,
    children: renderOptions(c.children || [], level + 1),
  }));
};
</script>

<template>
  <div class="relative w-full text-sm">
    <!-- Nút chọn -->
    <button
      @click="toggle"
      type="button"
      class="w-full border rounded px-3 py-2 flex justify-between items-center bg-gray-50 hover:bg-gray-100 text-gray-700"
    >
      <span>
        {{
          modelValue
            ? categories
                .flatMap((c) => [c, ...(c.children || [])])
                .find((c) => c.id === modelValue)?.name
            : "-- Chọn danh mục --"
        }}
      </span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="w-4 h-4 text-gray-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>

    <!-- Dropdown -->
    <div
      v-if="isOpen"
      class="absolute z-10 mt-1 w-full bg-white border rounded shadow max-h-60 overflow-y-auto"
    >
      <template v-for="c in renderOptions(categories)" :key="c.id">
        <div
          class="px-3 py-2 cursor-pointer hover:bg-gray-100"
          :class="
            c.level === 0 ? 'font-semibold text-gray-800' : 'text-gray-600'
          "
          :style="{
            paddingLeft: `${c.level * 16}px`,
            fontSize: `${14 - c.level}px`,
          }"
          @click="selectCategory(c.id)"
        >
          {{ c.name }}
        </div>
        <template v-for="child in c.children" :key="child.id">
          <div
            class="px-3 py-2 cursor-pointer hover:bg-gray-100"
            :class="
              child.level === 0
                ? 'font-semibold text-gray-800'
                : 'text-gray-600'
            "
            :style="{
              paddingLeft: `${child.level * 16}px`,
              fontSize: `${14 - child.level}px`,
            }"
            @click="selectCategory(child.id)"
          >
            {{ child.name }}
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

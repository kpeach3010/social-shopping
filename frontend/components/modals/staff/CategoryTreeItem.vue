<template>
  <div>
    <div
      :style="{ paddingLeft: 16 + level * 24 + 'px' }"
      :class="{
        'bg-gray-50': level % 2 !== 0,
        'hover:bg-gray-100': true,
      }"
      class="flex items-center py-3 transition-colors text-sm border-b border-gray-100 group"
    >
      <div class="w-1/2 flex items-center gap-2">
        <button
          v-if="category.children && category.children.length"
          @click="$emit('toggle', category.id)"
          class="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 transition text-gray-500"
        >
          <ChevronDown v-if="isExpanded" class="w-4 h-4" />
          <ChevronRight v-else class="w-4 h-4" />
        </button>
        <span v-else class="w-6 h-6 block"></span>

        <Folder
          class="w-4 h-4 transition-colors"
          :class="level === 0 ? 'text-blue-600 fill-blue-100' : 'text-gray-400'"
        />

        <span class="font-medium text-gray-800">{{ category.name }}</span>

        <span
          class="text-[10px] font-bold px-2 py-0.5 rounded-full ml-2 border"
          :class="
            category.totalProductCount > 0
              ? 'bg-blue-50 text-blue-600 border-blue-100'
              : 'bg-gray-100 text-gray-400 border-gray-200'
          "
        >
          {{ category.totalProductCount }} sp
        </span>

        <span
          v-if="level === 0"
          class="ml-2 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 bg-gray-100 rounded border border-gray-200"
        >
          ROOT
        </span>
      </div>

      <div class="w-1/4 text-center text-gray-500 font-mono text-xs">
        {{ category.sort }}
      </div>

      <div class="w-1/4 flex justify-end gap-2 pr-4">
        <button
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-blue-500 text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition"
          @click="$emit('edit', category)"
        >
          <PencilLine class="w-4 h-4" />
          <span class="text-sm">Sửa</span>
        </button>

        <button
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-600 bg-red-600 text-white hover:bg-red-500 active:bg-red-700 transition"
          @click="$emit('delete', category.id, category.name)"
        >
          <Trash2 class="w-4 h-4" />
          <span class="text-sm">Xóa</span>
        </button>
      </div>
    </div>

    <div v-if="category.children && category.children.length && isExpanded">
      <CategoryTreeItem
        v-for="child in category.children"
        :key="child.id"
        :category="child"
        :level="level + 1"
        :is-expanded="isExpanded"
        @toggle="$emit('toggle', $event)"
        @edit="$emit('edit', $event)"
        @delete="(id, name) => $emit('delete', id, name)"
      />
    </div>
  </div>
</template>

<script>
// Lưu ý: Dùng Options API export default để hỗ trợ đệ quy "name: CategoryTreeItem" tốt nhất
import {
  ChevronDown,
  ChevronRight,
  Folder,
  Trash2,
  PencilLine,
} from "lucide-vue-next";

export default {
  name: "CategoryTreeItem",
  components: { ChevronDown, ChevronRight, Folder, Trash2, PencilLine },
  props: {
    category: {
      type: Object,
      required: true,
    },
    level: {
      type: Number,
      default: 0,
    },
    isExpanded: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["toggle", "edit", "delete"],
};
</script>

<script setup>
/* Modal thêm danh mục – chỉ tạo mới */
import { ref, onMounted } from "vue";
import { X } from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";

const emit = defineEmits(["close", "refresh"]);
const config = useRuntimeConfig();
const auth = useAuthStore();

const name = ref(""); // tên danh mục
const parentId = ref(""); // danh mục cha
const sort = ref(0); // thứ tự hiển thị
const categories = ref([]); // danh sách category để chọn cha

// load tất cả danh mục (flat list)
const fetchCategories = async () => {
  const res = await $fetch("/category/all-categories", {
    baseURL: config.public.apiBase,
  });
  categories.value = res;
};

onMounted(fetchCategories);

// gọi API tạo category
const createCategory = async () => {
  try {
    await $fetch("/category/create-category", {
      baseURL: config.public.apiBase,
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
      },
      body: {
        name: name.value,
        parentId: parentId.value || null,
        sort: Number(sort.value),
      },
    });

    alert("Đã thêm danh mục!");
    emit("refresh");
    emit("close");
  } catch (err) {
    console.error(err);
    alert("Không thể tạo danh mục");
  }
};
</script>

<template>
  <div class="fixed inset-0 flex items-center justify-center z-50">
    <!-- Overlay -->
    <div
      class="absolute inset-0 bg-black/30 backdrop-blur-sm"
      @click="emit('close')"
    ></div>

    <!-- Modal -->
    <div
      class="relative bg-white rounded-xl shadow-xl w-[450px] p-6 z-10 max-h-[85vh] overflow-y-auto"
    >
      <!-- Header -->
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">Thêm danh mục</h2>
        <button @click="emit('close')" class="text-gray-600 hover:text-black">
          <X class="w-6 h-6" />
        </button>
      </div>

      <!-- Body -->
      <div class="space-y-4">
        <!-- Name -->
        <div>
          <label class="font-medium">Tên danh mục</label>
          <input
            v-model="name"
            class="w-full border px-3 py-2 rounded"
            placeholder="VD: Áo thun"
          />
        </div>

        <!-- Parent -->
        <div>
          <label class="font-medium">Danh mục cha (tùy chọn)</label>
          <select v-model="parentId" class="w-full border px-3 py-2 rounded">
            <option value="">-- Không có --</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">
              {{ c.name }}
            </option>
          </select>
        </div>

        <!-- Sort -->
        <div>
          <label class="font-medium">Thứ tự hiển thị</label>
          <input
            type="number"
            v-model="sort"
            class="w-full border px-3 py-2 rounded"
          />
        </div>

        <!-- Button -->
        <button
          class="w-full bg-black text-white py-2 rounded hover:bg-gray-800"
          @click="createCategory"
        >
          Thêm danh mục
        </button>
      </div>
    </div>
  </div>
</template>

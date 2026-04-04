<script setup>
/* Modal thêm danh mục – chỉ tạo mới */
import { ref, onMounted, watch } from "vue";
import { X, Loader2 } from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";

const props = defineProps({
  categories: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["close", "refresh"]);
const config = useRuntimeConfig();
const auth = useAuthStore();

const name = ref(""); // tên danh mục
const parentId = ref(""); // danh mục cha
const sort = ref(0); // thứ tự hiển thị
const isLoading = ref(false);


const errors = ref({
  name: "",
  general: "",
});

const validate = () => {
  errors.value = { name: "", general: "" };
  if (!name.value.trim()) {
    errors.value.name = "Tên danh mục không được để trống.";
    return false;
  }
  return true;
};

// Xóa lỗi khi người dùng nhập lại
watch(name, (newVal) => {
  if (newVal.trim()) errors.value.name = "";
});
// (Lưu ý: Bạn cần import 'watch' từ 'vue' ở dòng 3)


// Loại bỏ onMounted và fetchCategories cục bộ vì đã có prop từ parent


// gọi API tạo category
const createCategory = async () => {
  if (isLoading.value) return;
  if (!validate()) return;

  try {
    isLoading.value = true;
    await $fetch("/category/create-category", {
      baseURL: config.public.apiBase,
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
      },
      body: {
        name: name.value.trim(),
        parentId: parentId.value || null,
        sort: Number(sort.value),
      },
    });

    emit("refresh");
    emit("close");
  } catch (err) {
    if (err?.response?._data?.error) {
      const beError = err.response._data.error;
      if (beError.includes("tên") || beError.includes("Tên")) {
        errors.value.name = beError;
      } else {
        errors.value.general = beError;
      }
    } else {
      errors.value.general = "Có lỗi xảy ra khi tạo danh mục.";
    }
    console.error(err);
  } finally {
    isLoading.value = false;
  }
};

</script>

<template>
  <div class="fixed inset-0 flex items-center justify-center z-50">
    <!-- Overlay -->
    <div
      class="absolute inset-0 bg-black/30 backdrop-blur-sm"
      @click="$emit('close')"
    ></div>


    <!-- Modal -->
    <div
      class="relative bg-white rounded-xl shadow-xl w-[450px] p-6 z-10 max-h-[85vh] overflow-y-auto"
    >
      <!-- Header -->
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">Thêm danh mục</h2>
        <button @click="$emit('close')" class="text-gray-600 hover:text-black">
          <X class="w-6 h-6" />
        </button>
      </div>


      <!-- Body -->
      <div class="space-y-4">
        <!-- Name -->
        <div>
          <label class="font-medium text-sm text-gray-700 mb-1 block">Tên danh mục <span class="text-red-500">*</span></label>
          <input
            v-model="name"
            class="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-black/5 outline-none transition-all duration-200"
            :class="{ 'border-red-500 bg-red-50 focus:ring-red-50': errors.name }"
            placeholder="VD: Áo thun"
          />
          <p v-if="errors.name" class="text-red-500 text-[11px] mt-1 italic font-medium">
            {{ errors.name }}
          </p>
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

        <div v-if="errors.general" class="p-2 bg-red-50 border border-red-100 rounded text-red-600 text-xs font-medium">
          {{ errors.general }}
        </div>

        <!-- Button -->
        <button
          class="w-full bg-black text-white py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-all"
          @click="createCategory"
          :disabled="isLoading"
        >
          <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin" />
          <span>{{ isLoading ? "Đang xử lý..." : "Thêm danh mục" }}</span>
        </button>
      </div>

    </div>
  </div>
</template>

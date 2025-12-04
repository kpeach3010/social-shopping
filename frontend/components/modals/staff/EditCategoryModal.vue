<script setup>
import { ref, watch, computed } from "vue";
import { X, Folder, LayoutList } from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";

// Props nhận vào danh mục đang sửa và danh sách tất cả danh mục (để chọn cha)
const props = defineProps({
  categoryData: {
    type: Object,
    default: null,
  },
  allCategories: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["close", "refresh"]);
const auth = useAuthStore();
const loading = ref(false);

// State form category
const form = ref({
  id: "",
  name: "",
  parentId: "", // Dùng string rỗng để mapping với value="" của select
  sort: 0,
});

// Lọc danh sách cha: Loại bỏ chính danh mục đang sửa ra khỏi danh sách chọn
// Để tránh trường hợp chọn chính mình làm cha (gây lỗi vòng lặp vô tận)
const availableParents = computed(() => {
  if (!props.categoryData) return props.allCategories;
  return props.allCategories.filter((c) => c.id !== props.categoryData.id);
});

// Watch categoryData để fill dữ liệu vào form khi mở modal
watch(
  () => props.categoryData,
  (val) => {
    if (val) {
      form.value = {
        id: val.id,
        name: val.name || "",
        parentId: val.parentId || "", // Nếu null thì về rỗng
        sort: val.sort || 0,
      };
    }
  },
  { immediate: true, deep: true }
);

// Submit API
const submitCategory = async () => {
  if (!form.value.name.trim()) {
    alert("Vui lòng nhập tên danh mục");
    return;
  }

  loading.value = true;
  try {
    // Chuẩn bị payload khớp với updateCategoryService
    const payload = {
      name: form.value.name,
      parentId: form.value.parentId || null, // Nếu rỗng thì gửi null
      sort: Number(form.value.sort),
    };

    // Gọi API PUT
    await $fetch(
      `http://localhost:5000/api/category/update-category/${form.value.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify(payload),
      }
    );

    alert("Cập nhật danh mục thành công!");
    emit("refresh"); // Reload lại danh sách bên ngoài
    emit("close"); // Đóng modal
  } catch (err) {
    // Xử lý lỗi từ backend (ví dụ: trùng tên)
    const errorMsg = err?.response?._data?.error || "Lỗi cập nhật danh mục!";
    if (errorMsg.includes("category name already exists")) {
      alert("Tên danh mục đã tồn tại, vui lòng chọn tên khác!");
    } else {
      alert(errorMsg);
    }
    console.error(err);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="fixed inset-0 flex items-center justify-center z-50">
    <div
      class="absolute inset-0 bg-black/30 backdrop-blur-sm"
      @click="emit('close')"
    ></div>

    <div
      class="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden z-10 border"
    >
      <div
        class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center"
      >
        <h2 class="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Folder class="w-5 h-5 text-gray-600" />
          Chỉnh sửa danh mục
        </h2>
        <button
          class="text-gray-400 hover:text-black text-xl transition-colors"
          @click="emit('close')"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <div class="p-6 space-y-5">
        <div class="space-y-1">
          <label class="block text-sm font-medium text-gray-700"
            >Tên danh mục <span class="text-red-500">*</span></label
          >
          <input
            v-model="form.name"
            type="text"
            placeholder="Nhập tên danh mục..."
            class="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
          />
        </div>

        <div class="space-y-1">
          <label class="block text-sm font-medium text-gray-700"
            >Danh mục cha</label
          >
          <div class="relative">
            <select
              v-model="form.parentId"
              class="w-full border border-gray-300 px-3 py-2 rounded appearance-none focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white"
            >
              <option value="">-- Là danh mục gốc --</option>
              <option
                v-for="cat in availableParents"
                :key="cat.id"
                :value="cat.id"
              >
                {{ cat.name }}
              </option>
            </select>
            <div
              class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"
            >
              <svg
                class="fill-current h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path
                  d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"
                />
              </svg>
            </div>
          </div>
          <p class="text-xs text-gray-500 mt-1">
            Chọn danh mục cấp cao hơn chứa danh mục này.
          </p>
        </div>

        <div class="space-y-1">
          <label class="block text-sm font-medium text-gray-700"
            >Thứ tự hiển thị (Sort)</label
          >
          <div
            class="flex items-center border border-gray-300 rounded overflow-hidden w-full"
          >
            <div class="bg-gray-100 px-3 py-2 border-r border-gray-300">
              <LayoutList class="w-4 h-4 text-gray-500" />
            </div>
            <input
              v-model="form.sort"
              type="number"
              min="0"
              placeholder="0"
              class="w-full px-3 py-2 focus:outline-none"
            />
          </div>
          <p class="text-xs text-gray-500 mt-1">
            Số nhỏ hơn sẽ hiển thị trước.
          </p>
        </div>
      </div>

      <div
        class="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3"
      >
        <button
          @click="emit('close')"
          class="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition"
        >
          Hủy bỏ
        </button>
        <button
          @click="submitCategory"
          :disabled="loading"
          class="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <span v-if="loading">Đang lưu...</span>
          <span v-else>Lưu thay đổi</span>
        </button>
      </div>
    </div>
  </div>
</template>

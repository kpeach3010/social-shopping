<script setup>
import { ref, watch, onUnmounted, computed } from "vue";
import { ImageUp, X, Loader2 } from "lucide-vue-next";
import CategoryDropdown from "@/components/category/CategoryDropdown.vue";

const emit = defineEmits(["close"]);
const categories = ref([]);
const selectedCategory = ref(null);
const config = useRuntimeConfig();
const auth = useAuthStore();

// Tạo biến state loading
const isLoading = ref(false);

// Thông tin sản phẩm
const product = ref({
  name: "",
  price_default: "",
  description: "",
  categoryId: "",
  thumbnail: null,
  thumbnailPreview: null,
  backThumbnail: null,
  backThumbnailPreview: null,
  colors: [], // [{ colorName, file, preview, sizes: [{ sizeName, price, stock }] }]
});

// Upload thumbnail
const handleThumbnail = (e) => {
  const file = e.target.files[0];
  if (file) {
    if (product.value.thumbnailPreview) {
      URL.revokeObjectURL(product.value.thumbnailPreview);
    }
    product.value.thumbnail = file;
    product.value.thumbnailPreview = URL.createObjectURL(file);
  }
};

const removeThumbnail = () => {
  product.value.thumbnail = null;
  product.value.thumbnailPreview = null;
};

// Upload ảnh mặt sau
const handleBackThumbnail = (e) => {
  const file = e.target.files[0];
  if (file) {
    if (product.value.backThumbnailPreview) {
      URL.revokeObjectURL(product.value.backThumbnailPreview);
    }
    product.value.backThumbnail = file;
    product.value.backThumbnailPreview = URL.createObjectURL(file);
  }
};

const removeBackThumbnail = () => {
  product.value.backThumbnail = null;
  product.value.backThumbnailPreview = null;
};

// Thêm màu
const addColor = () => {
  product.value.colors.push({
    colorName: "",
    file: null,
    preview: null,
    sizes: [], // [{ sizeName, price, stock }]
  });
};
const removeColor = (colorIdx) => {
  // cleanup preview
  const color = product.value.colors[colorIdx];
  if (color.preview) URL.revokeObjectURL(color.preview);
  product.value.colors.splice(colorIdx, 1);
};
// Upload ảnh cho màu
const handleColorFile = (e, colorIdx) => {
  const file = e.target.files[0];
  if (file) {
    const color = product.value.colors[colorIdx];
    if (color.preview) URL.revokeObjectURL(color.preview);
    color.file = file;
    color.preview = URL.createObjectURL(file);
  }
};
const removeColorFile = (colorIdx) => {
  const color = product.value.colors[colorIdx];
  if (color.preview) URL.revokeObjectURL(color.preview);
  color.file = null;
  color.preview = null;
};
// Thêm size cho màu
const addSize = (colorIdx) => {
  product.value.colors[colorIdx].sizes.push({
    sizeName: "",
    price: "",
    stock: 0,
  });
};
const removeSize = (colorIdx, sizeIdx) => {
  product.value.colors[colorIdx].sizes.splice(sizeIdx, 1);
};

// Cleanup preview khi đóng popup
const cleanupPreviews = () => {
  if (product.value.thumbnailPreview) {
    URL.revokeObjectURL(product.value.thumbnailPreview);
  }
  if (product.value.backThumbnailPreview) {
    URL.revokeObjectURL(product.value.backThumbnailPreview);
  }
  product.value.colors.forEach((c) => {
    if (c.preview) URL.revokeObjectURL(c.preview);
    c.sizes?.forEach?.(() => {}); // nothing to cleanup for sizes
  });
};

onUnmounted(() => {
  cleanupPreviews();
});

// Submit API
const submitProduct = async () => {
  if (isLoading.value) return;
  try {
    isLoading.value = true;
    // Validate phía frontend
    if (Number(product.value.price_default || 0) < 50) {
      alert("Giá mặc định phải lớn hơn 50.");
      return;
    }

    // Kiểm tra tồn kho của từng biến thể
    for (const color of product.value.colors) {
      for (const size of color.sizes) {
        if (Number(size.stock || 0) < 0) {
          alert(`Số lượng tồn kho của size "${size.sizeName}" (màu ${color.colorName}) không được âm.`);
          return;
        }
      }
    }

    const formData = new FormData();
    console.log("Thumbnail debug:", product.value.thumbnail);

    formData.append("name", product.value.name);
    formData.append("price_default", product.value.price_default);
    formData.append("description", product.value.description);
    formData.append("categoryId", product.value.categoryId);
    if (product.value.thumbnail) {
      formData.append("thumbnail", product.value.thumbnail);
    }
    if (product.value.backThumbnail) {
      formData.append("backThumbnail", product.value.backThumbnail);
    }

    product.value.colors.forEach((c, i) => {
      formData.append(`colors[${i}][colorName]`, c.colorName);
      if (c.file) formData.append(`colors[${i}][file]`, c.file);
      c.sizes.forEach((s, j) => {
        formData.append(`colors[${i}][sizes][${j}][sizeName]`, s.sizeName);
        formData.append(`colors[${i}][sizes][${j}][price]`, s.price);
        formData.append(`colors[${i}][sizes][${j}][stock]`, s.stock);
      });
    });
    console.log("Thumbnail to upload:", product.value.thumbnail);

    console.log("FormData entries:");
    for (const [key, val] of formData.entries()) {
      console.log(key, val);
    }

    const res = await $fetch(`product/create-product`, {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
      },
      baseURL: config.public.apiBase,
    });

    console.log("API response:", res);
    alert("Thêm sản phẩm thành công!");
    emit("refresh"); // báo cho parent reload lại
    emit("close");
  } catch (err) {
    // log chi tiết lỗi
    if (err?.response?._data) {
      console.error("Lỗi thêm sản phẩm:", err.response._data);
      alert(`Lỗi: ${JSON.stringify(err.response._data)}`);
    } else {
      console.error("Lỗi thêm sản phẩm:", err);
      alert("Có lỗi xảy ra, vui lòng thử lại");
    }
  } finally {
    isLoading.value = false;
  }
};

// gọi API lấy danh mục
const fetchCategories = async () => {
  try {
    const res = await $fetch("/category/all-categories", {
      baseURL: config.public.apiBase,
    });
    categories.value = buildTree(res); // chuyển list sang tree
  } catch (err) {
    console.error("Lỗi tải danh mục:", err);
  }
};

// Hàm build tree từ flat data
const buildTree = (items, parentId = null, level = 0) => {
  return items
    .filter((i) => i.parentId === parentId)
    .map((i) => ({
      ...i,
      level,
      children: buildTree(items, i.id, level + 1),
    }));
};

// Computed để định dạng giá hiển thị (dấu phân cách hàng nghìn)
const displayPrice = computed({
  get: () => {
    if (product.value.price_default === "" || product.value.price_default === null || product.value.price_default === undefined) return "";
    return new Intl.NumberFormat("vi-VN").format(product.value.price_default);
  },
  set: (val) => {
    const raw = val.replace(/\D/g, ""); // chỉ giữ lại số
    product.value.price_default = raw ? parseInt(raw, 10) : "";
  },
});

onMounted(fetchCategories);
</script>

<template>
  <!-- Overlay -->
  <div class="fixed inset-0 flex items-center justify-center z-50">
    <!-- Nền mờ -->
    <div
      class="absolute inset-0 bg-black/30 backdrop-blur-sm"
      @click="emit('close')"
    ></div>

    <!-- Popup -->
    <div
      class="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden z-10 border"
    >
      <!-- Header -->
      <div
        class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center"
      >
        <h2 class="text-xl font-bold text-gray-800">Thêm sản phẩm mới</h2>
        <button
          class="text-gray-400 hover:text-black text-xl"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- Nội dung -->
      <div class="p-6 overflow-y-auto max-h-[70vh] pb-24">
        <!-- Thông tin cơ bản -->
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tên sản phẩm</label>
            <input
              v-model="product.name"
              type="text"
              placeholder="Nhập tên sản phẩm"
              class="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-black/5 outline-none"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
            <CategoryDropdown
              v-model="product.categoryId"
              :categories="categories"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Giá mặc định (VNĐ)</label>
            <input
              v-model="displayPrice"
              type="text"
              placeholder="Nhập giá mặc định (tối thiểu 50)"
              class="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-black/5 outline-none font-medium text-gray-900"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Mô tả sản phẩm</label>
            <div class="border rounded">
              <QuillEditor
                v-model:content="product.description"
                contentType="html"
                placeholder="Mô tả chi tiết sản phẩm..."
                :toolbar="[
                  ['bold', 'italic', 'underline'],
                  [{ list: 'ordered' }, { list: 'bullet' }],
                  ['clean'],
                ]"
                style="min-height: 150px"
              />
            </div>
          </div>

          <!-- Upload thumbnail -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Ảnh thumbnail (mặt trước)</label>
            <div class="space-y-2">
              <div
                v-if="!product.thumbnailPreview"
                class="flex items-center gap-2 cursor-pointer text-gray-700 hover:text-black"
              >
                <label class="flex items-center gap-2 cursor-pointer border-2 border-dashed rounded-lg p-4 w-full justify-center hover:bg-gray-50 transition-colors">
                  <ImageUp class="w-5 h-5" />
                  <span>Chọn ảnh thumbnail</span>
                  <input type="file" class="hidden" @change="handleThumbnail" />
                </label>
              </div>

              <div v-else class="relative inline-block">
                <img
                  :src="product.thumbnailPreview"
                  alt="Preview Thumbnail"
                  class="w-32 h-32 object-cover rounded border"
                />
                <button
                  @click="removeThumbnail"
                  class="absolute -top-2 -right-2 bg-white border rounded-full p-1 shadow hover:bg-gray-100"
                >
                  <X class="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          <!-- Upload ảnh mặt sau -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Ảnh mặt sau</label>
            <div class="space-y-2">
              <div
                v-if="!product.backThumbnailPreview"
                class="flex items-center gap-2 cursor-pointer text-gray-700 hover:text-black"
              >
                <label class="flex items-center gap-2 cursor-pointer border-2 border-dashed rounded-lg p-4 w-full justify-center hover:bg-gray-50 transition-colors">
                  <ImageUp class="w-5 h-5" />
                  <span>Chọn ảnh mặt sau</span>
                  <input
                    type="file"
                    class="hidden"
                    @change="handleBackThumbnail"
                  />
                </label>
              </div>

              <div v-else class="relative inline-block">
                <img
                  :src="product.backThumbnailPreview"
                  alt="Preview Ảnh mặt sau"
                  class="w-32 h-32 object-cover rounded border"
                />
                <button
                  @click="removeBackThumbnail"
                  class="absolute -top-2 -right-2 bg-white border rounded-full p-1 shadow hover:bg-gray-100"
                >
                  <X class="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Màu sắc & size -->
        <div class="mt-6">
          <h3 class="font-semibold mb-2">Màu sắc & kích cỡ</h3>
          <div
            v-for="(color, colorIdx) in product.colors"
            :key="colorIdx"
            class="mb-6 border rounded p-3 bg-gray-50"
          >
            <div class="flex items-end gap-3 mb-4">
              <div class="flex-1">
                <label class="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Tên màu</label>
                <input
                  v-model="color.colorName"
                  placeholder="Ví dụ: Đỏ, Xanh..."
                  class="w-full border px-3 py-1.5 rounded focus:ring-2 focus:ring-black/5 outline-none"
                />
              </div>
              
              <div class="flex flex-col items-center">
                <label class="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider text-center">Ảnh màu</label>
                <label
                  v-if="!color.preview"
                  class="flex items-center justify-center border rounded-lg w-[42px] h-[38px] cursor-pointer text-gray-500 hover:text-black hover:bg-white transition-colors"
                >
                  <ImageUp class="w-5 h-5" />
                  <input
                    type="file"
                    class="hidden"
                    @change="(e) => handleColorFile(e, colorIdx)"
                  />
                </label>
                <div v-else class="relative inline-block">
                  <img
                    :src="color.preview"
                    class="w-[42px] h-[38px] object-cover rounded border"
                  />
                  <button
                    @click="removeColorFile(colorIdx)"
                    class="absolute -top-1 -right-1 bg-white border rounded-full p-0.5 shadow hover:bg-gray-100"
                  >
                    <X class="w-3 h-3 text-gray-600" />
                  </button>
                </div>
              </div>

              <button
                @click="removeColor(colorIdx)"
                class="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium h-[38px]"
              >
                Xóa màu
              </button>
            </div>
            <!-- Danh sách size cho màu này -->
            <div>
              <div
                v-if="color.sizes.length > 0"
                class="grid grid-cols-4 gap-4 font-semibold text-gray-700 mb-2 px-1 text-sm"
              >
                <div class="col-span-2">Kích cỡ</div>
                <div>Tồn kho</div>
                <div></div>
              </div>
              <div
                v-for="(size, sizeIdx) in color.sizes"
                :key="sizeIdx"
                class="grid grid-cols-4 gap-4 mb-2 items-center"
              >
                <div class="col-span-2">
                  <input
                    v-model="size.sizeName"
                    placeholder="M, L, XL..."
                    class="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-black/5 outline-none text-sm"
                  />
                </div>
                <div>
                  <input
                    v-model="size.stock"
                    type="number"
                    min="0"
                    placeholder="Số lượng"
                    class="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-black/5 outline-none text-sm"
                  />
                </div>
                <div class="flex justify-end">
                  <button
                    @click="removeSize(colorIdx, sizeIdx)"
                    class="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium flex items-center justify-center min-w-[50px]"
                  >
                    Xóa
                  </button>
                </div>
              </div>
              <button
                @click="addSize(colorIdx)"
                class="mt-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <span>+ Thêm kích cỡ</span>
              </button>
            </div>
          </div>
          <button
            @click="addColor"
            class="mt-2 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            + Thêm màu
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3"
      >
        <button
          @click="submitProduct"
          :disabled="isLoading"
          class="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin" />

          <span>{{ isLoading ? "Đang xử lý..." : "Lưu sản phẩm" }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

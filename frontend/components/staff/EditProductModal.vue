<script setup>
import { ref, watch, onUnmounted } from "vue";
import { ImageUp, X } from "lucide-vue-next";
import CategoryDropdown from "@/components/category/CategoryDropdown.vue";

const props = defineProps({
  show: Boolean,
  productData: Object, // null nếu là thêm mới, object nếu là sửa
  categories: Array,
});
const emit = defineEmits(["close", "refresh"]);
const config = useRuntimeConfig();
const auth = useAuthStore();

// State sản phẩm (clone để không ảnh hưởng trực tiếp prop)
const product = ref({
  name: "",
  price_default: "",
  description: "",
  categoryId: "",
  thumbnail: null,
  thumbnailPreview: null,
  colors: [], // [{ colorName, file, preview, sizes: [{ sizeName, price, stock }] }]
});

// Khi mở modal sửa, clone dữ liệu vào form
watch(
  () => props.productData,
  (val) => {
    if (val) {
      // Deep clone để không ảnh hưởng prop
      product.value = JSON.parse(JSON.stringify(val));
      // Nếu có thumbnailUrl thì set preview
      if (val.thumbnailUrl) product.value.thumbnailPreview = val.thumbnailUrl;
      // Nếu có ảnh màu thì set preview cho từng màu
      product.value.colors?.forEach((c, i) => {
        if (c.imageUrl) product.value.colors[i].preview = c.imageUrl;
      });
      if (val.colors) {
        product.value.colors = val.colors.map((c) => ({
          ...c,
          colorName: c.name || c.colorName || "", // fallback nếu name bị undefined
          id: c.id ?? c.colorId, // fallback nếu id bị undefined
          sizes: Array.isArray(c.sizes) ? c.sizes : [], // đảm bảo luôn có mảng sizes
        }));
      }
    } else {
      // Reset nếu là thêm mới
      product.value = {
        name: "",
        price_default: "",
        description: "",
        categoryId: "",
        thumbnail: null,
        thumbnailPreview: null,
        colors: [],
      };
    }
  },
  { immediate: true }
);

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
// Thêm màu
const addColor = () => {
  product.value.colors.push({
    colorName: "",
    file: null,
    preview: null,
    sizes: [],
  });
};
// Xóa màu (gọi API backend)
const removeColor = async (colorIdx) => {
  const color = product.value.colors[colorIdx];
  console.log(color);
  if (!color || !color.sizes?.length) {
    product.value.colors.splice(colorIdx, 1);
    return;
  }

  // Ưu tiên colorId, fallback sang id
  const colorId = color.colorId || color.id;
  if (!colorId) {
    alert("Không tìm thấy id của màu để xóa!");
    return;
  }

  if (!confirm("Bạn có chắc muốn xóa toàn bộ màu này và các size liên quan?"))
    return;
  try {
    console.log("colorId gửi lên:", colorId);
    await $fetch(`http://localhost:5000/api/product/delete-color/${colorId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    emit("refresh");
    alert("Đã xóa màu thành công!");
  } catch (err) {
    alert("Lỗi xóa màu!");
    console.error(err);
  }
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
// Xóa variant (size) (gọi API backend)
const removeSize = async (colorIdx, sizeIdx) => {
  const size = product.value.colors[colorIdx].sizes[sizeIdx];
  if (!size || !size.variantId) {
    product.value.colors[colorIdx].sizes.splice(sizeIdx, 1);
    return;
  }
  if (!confirm("Bạn có chắc muốn xóa size này?")) return;
  try {
    await $fetch(
      `http://localhost:5000/api/product/delete-variant/${size.variantId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      }
    );
    emit("refresh");
    alert("Đã xóa size thành công!");
  } catch (err) {
    alert("Lỗi xóa size!");
    console.error(err);
  }
};
// Cleanup preview khi đóng popup
const cleanupPreviews = () => {
  if (product.value.thumbnailPreview) {
    URL.revokeObjectURL(product.value.thumbnailPreview);
  }
  product.value.colors.forEach((c) => {
    if (c.preview) URL.revokeObjectURL(c.preview);
  });
};
onUnmounted(() => {
  cleanupPreviews();
});
// Submit API
const submitProduct = async () => {
  try {
    const formData = new FormData();
    formData.append("name", product.value.name);
    formData.append("price_default", product.value.price_default);
    formData.append("description", product.value.description);
    formData.append("categoryId", product.value.categoryId);
    if (product.value.thumbnail) {
      formData.append("thumbnail", product.value.thumbnail);
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
    let url = `http://localhost:5000/api/product/update-product/${props.productData.id}`;
    let method = "PUT";
    await $fetch(url, {
      method,
      body: formData,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    alert("Cập nhật thành công!");
    emit("refresh");
    emit("close");
  } catch (err) {
    alert("Lỗi lưu sản phẩm!");
    console.error(err);
  }
};
</script>

<template>
  <div v-if="show" class="fixed inset-0 flex items-center justify-center z-50">
    <div
      class="absolute inset-0 bg-black/30 backdrop-blur-sm"
      @click="emit('close')"
    ></div>
    <div
      class="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden z-10 border"
    >
      <div
        class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center"
      >
        <h2 class="text-xl font-bold text-gray-800">Chỉnh sửa sản phẩm</h2>
        <button
          class="text-gray-400 hover:text-black text-xl"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>
      <div class="p-6 overflow-y-auto max-h-[70vh] pb-24">
        <div class="space-y-3">
          <input
            v-model="product.name"
            type="text"
            placeholder="Tên sản phẩm"
            class="w-full border px-3 py-2 rounded"
          />
          <div class="space-y-2">
            <CategoryDropdown
              v-model="product.categoryId"
              :categories="categories"
            />
          </div>
          <input
            v-model="product.price_default"
            type="number"
            placeholder="Giá mặc định"
            class="w-full border px-3 py-2 rounded"
          />
          <textarea
            v-model="product.description"
            placeholder="Mô tả"
            class="w-full border px-3 py-2 rounded"
          ></textarea>
          <div class="space-y-2">
            <div
              v-if="!product.thumbnailPreview"
              class="flex items-center gap-2 cursor-pointer text-gray-700 hover:text-black"
            >
              <label class="flex items-center gap-2 cursor-pointer">
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
        <div class="mt-6">
          <h3 class="font-semibold mb-2">Màu sắc & kích cỡ</h3>
          <div
            v-for="(color, colorIdx) in product.colors"
            :key="colorIdx"
            class="mb-6 border rounded p-3 bg-gray-50"
          >
            <div class="flex items-center gap-3 mb-2">
              <input
                v-model="color.colorName"
                placeholder="Tên màu"
                class="border px-2 py-1 rounded flex-1"
              />
              <label
                v-if="!color.preview"
                class="flex items-center gap-2 cursor-pointer text-gray-700 hover:text-black"
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
                  class="w-16 h-16 object-cover rounded border"
                />
                <button
                  @click="removeColorFile(colorIdx)"
                  class="absolute -top-2 -right-2 bg-white border rounded-full p-1 shadow hover:bg-gray-100"
                >
                  <X class="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <button
                @click="removeColor(colorIdx)"
                class="ml-2 px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
              >
                Xóa màu
              </button>
            </div>
            <div>
              <div
                v-if="color.sizes.length > 0"
                class="grid grid-cols-7 gap-2 font-semibold text-gray-700 mb-1"
              >
                <div>Tên size</div>
                <div>Giá</div>
                <div>Kho</div>
                <div></div>
              </div>
              <div
                v-for="(size, sizeIdx) in color.sizes"
                :key="sizeIdx"
                class="grid grid-cols-7 gap-2 mb-1 items-center"
              >
                <input
                  v-model="size.sizeName"
                  placeholder="Kích cỡ"
                  class="border px-2 py-1 rounded"
                />
                <input
                  v-model="size.price"
                  type="number"
                  placeholder="Giá"
                  class="border px-2 py-1 rounded"
                />
                <input
                  v-model="size.stock"
                  type="number"
                  placeholder="Kho"
                  class="border px-2 py-1 rounded"
                />
                <button
                  @click="removeSize(colorIdx, sizeIdx)"
                  class="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                >
                  Xóa
                </button>
              </div>
              <button
                @click="addSize(colorIdx)"
                class="mt-1 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
              >
                + Thêm size
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
      <div
        class="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3"
      >
        <button
          @click="submitProduct"
          class="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
        >
          Lưu sản phẩm
        </button>
      </div>
    </div>
  </div>
</template>

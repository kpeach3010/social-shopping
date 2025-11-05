<template>
  <div
    v-if="open"
    class="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-[9999]"
  >
    <!-- Modal -->
    <div
      class="bg-white rounded-2xl w-full max-w-md p-5 shadow-xl relative animate-fadeIn"
    >
      <!-- Nút đóng -->
      <button
        @click="$emit('close')"
        class="absolute top-3 right-3 text-gray-400 hover:text-black text-xl"
      >
        ✕
      </button>

      <!-- Tiêu đề -->
      <h2
        class="text-lg font-semibold mb-3 text-gray-800 flex items-center gap-2"
      >
        <span></span> Chọn biến thể sản phẩm
      </h2>

      <!-- Ảnh -->
      <div v-if="productDetail" class="flex gap-3">
        <!-- Danh sách ảnh nhỏ -->
        <div class="flex flex-col gap-2 w-16">
          <img
            v-for="(img, idx) in allImages"
            :key="idx"
            :src="img"
            class="w-16 h-16 object-cover border cursor-pointer hover:opacity-80 transition"
            :class="{ 'border-2 border-black': selectedImage === img }"
            @click="selectedImage = img"
          />
        </div>

        <!-- Ảnh chính -->
        <div class="flex-1 flex items-center justify-center">
          <img
            :src="selectedImage"
            @error="onImageError"
            alt="Ảnh sản phẩm"
            class="w-64 h-64 object-cover border rounded-md"
          />
        </div>
      </div>

      <!-- Màu sắc -->
      <div v-if="productDetail" class="mt-5">
        <label class="font-semibold text-gray-800 text-sm mb-2 block"
          >Màu sắc</label
        >
        <div class="flex flex-wrap gap-2">
          <button
            v-for="color in colors"
            :key="color"
            @click="selectColor(color)"
            class="px-3 py-1 border text-sm font-medium transition"
            :class="[
              selectedColor === color
                ? 'bg-black text-white border-black'
                : 'hover:bg-gray-100 border-gray-300 text-gray-800',
            ]"
          >
            {{ color }}
          </button>
        </div>
      </div>

      <!-- Kích thước -->
      <div v-if="productDetail" class="mt-3">
        <label class="font-semibold text-gray-800 text-sm mb-2 block"
          >Kích thước</label
        >
        <div class="flex flex-wrap gap-2">
          <button
            v-for="size in sizes"
            :key="size"
            @click="selectedSize = size"
            class="px-3 py-1 border text-sm font-medium transition"
            :class="[
              selectedSize === size
                ? 'bg-black text-white border-black'
                : 'hover:bg-gray-100 border-gray-300 text-gray-800',
            ]"
          >
            {{ size }}
          </button>
        </div>
      </div>

      <!-- Số lượng -->
      <div v-if="productDetail" class="mt-4 flex items-center gap-3">
        <button @click="decreaseQty" class="px-3 py-1 border hover:bg-gray-100">
          -
        </button>
        <span class="font-medium text-gray-800">{{ quantity }}</span>
        <button @click="increaseQty" class="px-3 py-1 border hover:bg-gray-100">
          +
        </button>
      </div>

      <!-- Giá + Kho -->
      <div v-if="productDetail" class="mt-4 text-gray-700 text-sm">
        <p>
          Giá:
          <span class="font-semibold text-gray-900">
            {{
              formatPrice(selectedVariant?.price || productDetail.price_default)
            }}
          </span>
        </p>
        <p>
          Kho còn:
          <span class="font-semibold text-gray-900">
            {{ selectedVariant?.stock || productDetail.stock }}
          </span>
        </p>
      </div>

      <!-- Nút xác nhận -->
      <div class="mt-6 flex justify-end gap-3">
        <button
          @click="$emit('close')"
          class="px-4 py-2 border border-gray-300 hover:bg-gray-100"
        >
          Hủy
        </button>
        <button
          @click="confirmChoose"
          class="px-5 py-2 bg-black text-white hover:bg-gray-800 disabled:bg-gray-400"
          :disabled="!selectedVariant"
        >
          Xác nhận chọn
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from "@/stores/auth";

const props = defineProps({
  open: Boolean,
  groupOrderId: String,
  product: Object,
});
const emit = defineEmits(["close", "chosen"]);

const config = useRuntimeConfig();
const auth = useAuthStore();

const productDetail = ref(null);
const selectedImage = ref("");
const selectedColor = ref(null);
const selectedSize = ref(null);
const quantity = ref(1);

// ====== Gọi API lấy chi tiết sản phẩm ======
watch(
  () => props.product?.id,
  async (id) => {
    if (!id) return console.warn("Không có product.id để gọi API");

    try {
      const res = await $fetch(`/product/get-product/${id}`, {
        baseURL: config.public.apiBase,
      });
      console.log("API trả về sản phẩm:", res);
      productDetail.value = res;
      selectedImage.value = res.thumbnailUrl;
    } catch (err) {
      console.error("Lỗi fetch sản phẩm:", err);
    }
  },
  { immediate: true }
);

// ====== Danh sách ảnh: ưu tiên ảnh theo màu ======
const allImages = computed(() => {
  if (!productDetail.value) return [];
  const variantImgs = productDetail.value.variants
    ?.filter((v) => v.imageUrl)
    .map((v) => v.imageUrl);
  return [productDetail.value.thumbnailUrl, ...new Set(variantImgs)];
});

// ====== Màu & Size ======
const colors = computed(() => {
  if (!productDetail.value?.variants) return [];
  return [...new Set(productDetail.value.variants.map((v) => v.color))];
});

const sizes = computed(() => {
  if (!productDetail.value?.variants) return [];
  return [...new Set(productDetail.value.variants.map((v) => v.size))];
});

const selectedVariant = computed(() =>
  productDetail.value?.variants?.find(
    (v) => v.color === selectedColor.value && v.size === selectedSize.value
  )
);

// ====== Xử lý chọn màu hiển thị ảnh variant tương ứng ======
function selectColor(color) {
  selectedColor.value = color;
  const variant = productDetail.value?.variants?.find((v) => v.color === color);
  if (variant?.imageUrl) selectedImage.value = variant.imageUrl;
}

// ====== Hàm tiện ích ======
function onImageError(e) {
  e.target.src = "https://cdn-icons-png.flaticon.com/512/2748/2748558.png";
}

function formatPrice(v) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(v || 0);
}

function increaseQty() {
  quantity.value++;
}

function decreaseQty() {
  if (quantity.value > 1) quantity.value--;
}

// ====== Gọi API chọn sản phẩm ======
async function confirmChoose() {
  if (!selectedVariant.value) {
    alert("Vui lòng chọn màu và kích thước!");
    return;
  }

  try {
    const res = await $fetch(`/group-orders/${props.groupOrderId}/choose`, {
      method: "PATCH",
      baseURL: config.public.apiBase,
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        "Content-Type": "application/json",
      },
      body: {
        variantId: selectedVariant.value.id,
        quantity: quantity.value,
      },
    });

    console.log("Chọn sản phẩm thành công:", res);
    alert(res.message || "Chọn sản phẩm thành công!");

    emit("chosen", res.data);
    emit("close");
  } catch (err) {
    console.error("Lỗi khi chọn sản phẩm:", err);
    alert("Không thể chọn sản phẩm, vui lòng thử lại.");
  }
}
</script>

<style scoped>
.animate-fadeIn {
  animation: fadeIn 0.25s ease-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>

<template>
  <div
    v-if="open"
    class="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-[9999]"
  >
    <!-- Modal -->
    <div
      class="bg-white rounded-2xl w-full max-w-3xl p-5 shadow-xl relative animate-fadeIn"
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
        class="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2"
      >
        Chọn màu & kích thước
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Cột trái: ảnh + chọn biến thể hiện tại -->
        <div>
          <!-- Ảnh -->
          <div v-if="productDetail" class="flex gap-3">
            <!-- Danh sách ảnh nhỏ -->
            <div class="flex flex-col gap-2 w-16">
              <img
                v-for="(img, idx) in allImages"
                :key="idx"
                :src="img"
                class="w-16 h-16 object-cover border cursor-pointer hover:opacity-80 transition rounded-md"
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
                class="w-64 h-64 object-cover border rounded-lg"
              />
            </div>
          </div>

          <!-- Thông tin sản phẩm -->
          <div
            v-if="productDetail"
            class="mt-4 space-y-1 text-sm text-gray-700"
          >
            <p class="font-semibold text-gray-900">
              {{ productDetail.name || "Sản phẩm" }}
            </p>
            <p>
              Giá gốc:
              <span class="font-semibold text-gray-900">
                {{ formatPrice(productDetail.price_default) }}
              </span>
            </p>
            <p>
              Tồn kho tổng:
              <span class="font-semibold text-gray-900">
                {{ productDetail.stock }}
              </span>
            </p>
          </div>
        </div>

        <!-- Cột phải: chọn màu/size + số lượng + danh sách đã chọn -->
        <div class="flex flex-col h-full">
          <!-- Màu sắc -->
          <div v-if="productDetail">
            <label class="font-semibold text-gray-800 text-sm mb-2 block">
              Màu sắc
            </label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="color in colors"
                :key="color"
                @click="!isColorDisabled(color) && selectColor(color)"
                :disabled="isColorDisabled(color)"
                class="px-3 py-1 border text-sm font-medium transition rounded-md"
                :class="[
                  selectedColor === color
                    ? 'bg-black text-white border-black'
                    : 'hover:bg-gray-100 border-gray-300 text-gray-800',
                  isColorDisabled(color) ? 'opacity-40 cursor-not-allowed' : '',
                ]"
              >
                {{ color }}
              </button>
            </div>
          </div>

          <!-- Kích thước -->
          <div v-if="productDetail" class="mt-3">
            <label class="font-semibold text-gray-800 text-sm mb-2 block">
              Kích thước
            </label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="size in sizes"
                :key="size"
                @click="!isSizeDisabled(size) && (selectedSize = size)"
                :disabled="isSizeDisabled(size)"
                class="px-3 py-1 border text-sm font-medium transition rounded-md"
                :class="[
                  selectedSize === size
                    ? 'bg-black text-white border-black'
                    : 'hover:bg-gray-100 border-gray-300 text-gray-800',
                  isSizeDisabled(size) ? 'opacity-40 cursor-not-allowed' : '',
                ]"
              >
                {{ size }}
              </button>
            </div>
          </div>

          <!-- Số lượng + info variant hiện tại -->
          <div v-if="productDetail" class="mt-4 flex items-center gap-4">
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-700">Số lượng</span>
              <button
                @click="decreaseQty"
                class="w-8 h-8 flex items-center justify-center border hover:bg-gray-100 rounded-md text-lg"
              >
                -
              </button>
              <span class="w-10 text-center font-medium text-gray-800">
                {{ quantity }}
              </span>
              <button
                @click="increaseQty"
                class="w-8 h-8 flex items-center justify-center border hover:bg-gray-100 rounded-md text-lg"
              >
                +
              </button>
            </div>

            <div class="text-xs text-gray-600 space-y-0.5">
              <p>
                Giá:
                <span class="font-semibold text-gray-900">
                  {{
                    formatPrice(
                      selectedVariant?.price || productDetail.price_default
                    )
                  }}
                </span>
              </p>
              <p>
                Kho:
                <span class="font-semibold text-gray-900">
                  {{ selectedVariant?.stock ?? "—" }}
                </span>
              </p>
            </div>
          </div>

          <!-- Nút thêm vào danh sách -->
          <div class="mt-4">
            <button
              @click="addCurrentSelection"
              class="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:bg-gray-400"
              :disabled="!selectedVariant"
            >
              Thêm vào danh sách mua
            </button>
            <p class="text-xs text-gray-500 mt-1">
              Bạn có thể chọn nhiều màu / size khác nhau rồi xác nhận một lần.
            </p>
          </div>

          <!-- Danh sách biến thể đã chọn -->
          <div class="mt-4 flex-1 flex flex-col">
            <h3 class="text-sm font-semibold text-gray-800 mb-2">
              Màu + size đã chọn
            </h3>

            <div
              v-if="selectedItems.length === 0"
              class="text-xs text-gray-500 border border-dashed border-gray-300 rounded-md p-3"
            >
              Chưa có sản phẩm nào được chọn.
            </div>

            <div
              v-else
              class="border border-gray-200 rounded-md max-h-60 overflow-y-auto"
            >
              <table class="w-full text-xs">
                <thead class="bg-gray-50 sticky top-0">
                  <tr class="text-gray-500">
                    <th class="px-3 py-2 text-left">Sản phẩm</th>
                    <th class="px-3 py-2 text-center w-28">Số lượng</th>
                    <th class="px-3 py-2 text-right w-20">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in selectedItems"
                    :key="item.variantId"
                    class="border-t"
                  >
                    <td class="px-3 py-2 text-gray-800">
                      <div class="font-medium">
                        {{ item.color }} / {{ item.size }}
                      </div>
                    </td>
                    <td class="px-3 py-2">
                      <div class="flex items-center justify-center gap-1">
                        <button
                          @click="
                            changeItemQty(item.variantId, item.quantity - 1)
                          "
                          class="w-6 h-6 flex items-center justify-center border rounded hover:bg-gray-100"
                        >
                          -
                        </button>
                        <span class="w-8 text-center font-medium">
                          {{ item.quantity }}
                        </span>
                        <button
                          @click="
                            changeItemQty(item.variantId, item.quantity + 1)
                          "
                          class="w-6 h-6 flex items-center justify-center border rounded hover:bg-gray-100"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td class="px-3 py-2 text-right">
                      <button
                        @click="removeItem(item.variantId)"
                        class="text-red-500 hover:text-red-600 text-xs font-medium"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div
              v-if="selectedItems.length > 0"
              class="mt-2 text-xs text-gray-700 flex justify-between items-center"
            >
              <span>
                Tổng số lượng:
                <span class="font-semibold">{{ totalQuantity }}</span>
              </span>
              <span class="text-gray-500">
                Tổng sản phẩm: {{ selectedItems.length }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-6 flex justify-end gap-3">
        <button
          @click="$emit('close')"
          class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 text-sm"
        >
          Hủy
        </button>
        <button
          @click="confirmChoose"
          class="px-5 py-2 bg-black text-white hover:bg-gray-800 disabled:bg-gray-400 rounded-md text-sm font-medium flex items-center justify-center gap-2"
          :disabled="selectedItems.length === 0 || isLoading"
          :style="isLoading ? 'opacity:0.7;pointer-events:none;' : ''"
        >
          <span v-if="isLoading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <span>{{ isLoading ? 'Đang xử lý...' : 'Xác nhận lựa chọn' }}</span>
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

// Danh sách các biến thể đã chọn: [{ variantId, color, size, quantity }]
const selectedItems = ref([]);

// ====== Disable color nếu tất cả variant của màu đó hết kho hoặc không có variant nào còn hàng ======
function isColorDisabled(color) {
  if (!productDetail.value?.variants) return false;
  // Nếu đã chọn size thì chỉ disable nếu không có variant còn hàng cho cả color+size
  if (selectedSize.value) {
    return !productDetail.value.variants.some(
      (v) => v.color === color && v.size === selectedSize.value && v.stock > 0
    );
  }
  // Nếu chưa chọn size, disable nếu không có variant nào còn hàng cho color này
  return !productDetail.value.variants.some(
    (v) => v.color === color && v.stock > 0
  );
}

// ====== Disable size nếu tất cả variant của size đó hết kho hoặc không có variant nào còn hàng ======
function isSizeDisabled(size) {
  if (!productDetail.value?.variants) return false;
  // Nếu đã chọn color thì chỉ disable nếu không có variant còn hàng cho cả color+size
  if (selectedColor.value) {
    return !productDetail.value.variants.some(
      (v) => v.size === size && v.color === selectedColor.value && v.stock > 0
    );
  }
  // Nếu chưa chọn color, disable nếu không có variant nào còn hàng cho size này
  return !productDetail.value.variants.some(
    (v) => v.size === size && v.stock > 0
  );
}

// ====== Gọi API lấy chi tiết sản phẩm ======
watch(
  () => props.product?.id,
  async (id) => {
    if (!id) return;

    try {
      const res = await $fetch(`/product/get-product/${id}`, {
        baseURL: config.public.apiBase,
      });
      console.log("API trả về sản phẩm:", res);
      productDetail.value = res;
      selectedImage.value = res.thumbnailUrl;
      // reset lựa chọn khi đổi sản phẩm
      selectedColor.value = null;
      selectedSize.value = null;
      quantity.value = 1;
      selectedItems.value = [];
    } catch (err) {
      console.error("Lỗi fetch sản phẩm:", err);
    }
  },
  { immediate: true }
);

// ====== Danh sách ảnh: ưu tiên ảnh theo màu ======
const allImages = computed(() => {
  if (!productDetail.value) return [];
  const variantImgs =
    productDetail.value.variants
      ?.filter((v) => v.imageUrl)
      .map((v) => v.imageUrl) || [];
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

const totalQuantity = computed(() =>
  selectedItems.value.reduce((sum, item) => sum + item.quantity, 0)
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

// ====== Thêm / sửa / xoá item trong selectedItems ======
function addCurrentSelection() {
  if (!selectedVariant.value) {
    alert("Vui lòng chọn màu và kích thước!");
    return;
  }

  if (quantity.value <= 0) {
    alert("Số lượng phải lớn hơn 0");
    return;
  }

  const v = selectedVariant.value;

  if (v.stock && quantity.value > v.stock) {
    alert("Số lượng vượt quá tồn kho biến thể.");
    return;
  }

  const existing = selectedItems.value.find((i) => i.variantId === v.id);

  if (existing) {
    // Cộng dồn số lượng
    const newQty = existing.quantity + quantity.value;
    if (v.stock && newQty > v.stock) {
      alert("Tổng số lượng vượt quá tồn kho biến thể.");
      return;
    }
    existing.quantity = newQty;
  } else {
    selectedItems.value.push({
      variantId: v.id,
      color: v.color,
      size: v.size,
      quantity: quantity.value,
    });
  }

  // Reset quantity về 1 cho lần chọn tiếp theo
  quantity.value = 1;
}

function changeItemQty(variantId, newQty) {
  const item = selectedItems.value.find((i) => i.variantId === variantId);
  if (!item) return;

  if (newQty <= 0) {
    // nếu = 0 thì xoá
    selectedItems.value = selectedItems.value.filter(
      (i) => i.variantId !== variantId
    );
    return;
  }

  const v = productDetail.value?.variants?.find((v) => v.id === variantId);
  if (v?.stock && newQty > v.stock) {
    alert("Số lượng vượt quá tồn kho biến thể.");
    return;
  }

  item.quantity = newQty;
}

function removeItem(variantId) {
  selectedItems.value = selectedItems.value.filter(
    (i) => i.variantId !== variantId
  );
}

// ====== Gọi API chọn sản phẩm (multi-variant) ======

const isLoading = ref(false);

async function confirmChoose() {
  if (selectedItems.value.length === 0 || isLoading.value) {
    return;
  }
  isLoading.value = true;
  try {
    const payloadItems = selectedItems.value.map((i) => ({
      variantId: i.variantId,
      quantity: i.quantity,
    }));

    const res = await $fetch(
      `/group-orders/${props.groupOrderId}/select-items`,
      {
        method: "POST",
        baseURL: config.public.apiBase,
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          "Content-Type": "application/json",
        },
        body: {
          items: payloadItems,
        },
      }
    );

    console.log("Chọn sản phẩm (multi-variant) thành công:", res);
    alert(res.message || "Chọn sản phẩm thành công!");

    // Emit cho parent nếu cần xử lý thêm
    emit("chosen", {
      items: selectedItems.value,
      response: res,
    });

    emit("close");
  } catch (err) {
    console.error("Lỗi khi chọn sản phẩm:", err);
    alert(err?.data?.message || "Không thể chọn sản phẩm, vui lòng thử lại.");
  } finally {
    isLoading.value = false;
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

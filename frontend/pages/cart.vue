<template>
  <div>
    <main class="container mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold mb-6">Giỏ hàng của bạn</h1>
      <!-- Loading state -->
      <div v-if="loading" class="flex items-center justify-center py-10">
        <div
          class="animate-spin rounded-full h-6 w-6 border-b-2 border-black mx-auto"
        ></div>
      </div>

      <div v-else-if="!cart?.items?.length" class="text-gray-500">
        Giỏ hàng trống.
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="item in cart.items"
          :key="item.id"
          class="flex items-center gap-4 border rounded-lg p-4 shadow-sm"
        >
          <!-- Checkbox chọn sản phẩm -->
          <input
            type="checkbox"
            v-model="selectedItems"
            :value="item.id"
            class="w-4 h-4 text-black border-gray-300 rounded"
          />

          <!-- Ảnh -->
          <div
            class="w-20 h-20 flex-shrink-0 cursor-pointer"
            @click="goToProduct(item)"
          >
            <img
              :src="item.imageUrl"
              class="w-full h-full object-cover rounded hover:opacity-80 transition"
            />
          </div>

          <!-- Thông tin -->
          <div class="flex-1 min-w-0">
            <h2
              class="font-semibold text-base sm:text-lg truncate cursor-pointer hover:text-gray-700 transition"
              @click="goToProduct(item)"
            >
              {{ item.productName }}
            </h2>
            <p class="text-sm text-gray-500">
              Màu: {{ item.colorName }} · Size: {{ item.sizeName }}
            </p>
            <p class="text-xs text-gray-400">
              Kho: {{ item.stock || 0 }} sản phẩm
            </p>
            <p
              v-if="item.quantity > (item.stock || 0)"
              class="text-xs text-red-500 font-medium"
            >
              ⚠️ Vượt quá kho! Hiện tại chỉ còn {{ item.stock || 0 }} sản phẩm
            </p>
          </div>

          <!-- Số lượng -->
          <div class="flex items-center space-x-2 relative">
            <button
              @click="dec(item)"
              class="px-2 py-1 border rounded hover:bg-gray-100 transition-all duration-150"
              :class="{ 'opacity-75': loadingItems.has(item.id) }"
            >
              −
            </button>
            <div class="relative px-2 min-w-[2rem] text-center">
              <span class="select-none">{{ item.quantity }}</span>
              <!-- Subtle loading indicator -->
              <div
                v-if="loadingItems.has(item.id)"
                class="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"
              ></div>
            </div>
            <button
              @click="inc(item)"
              class="px-2 py-1 border rounded hover:bg-gray-100 transition-all duration-150"
              :class="{ 'opacity-75': loadingItems.has(item.id) }"
            >
              +
            </button>
          </div>

          <!-- Giá -->
          <div class="w-24 text-right font-bold">
            {{ formatPrice(item.price * item.quantity) }}
          </div>
        </div>

        <!-- Tóm tắt -->
        <div class="mt-6 flex justify-between items-center">
          <div class="flex items-center space-x-2">
            <input
              type="checkbox"
              v-model="selectAll"
              @change="toggleSelectAll"
              class="w-4 h-4 text-black border-gray-300 rounded"
            />
            <span class="text-gray-600">Chọn tất cả</span>

            <!-- Nút xóa đa chọn -->
            <button
              v-if="selectedItems.length > 0"
              @click="removeSelectedItems"
              class="ml-4 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
              :title="`Xóa ${selectedItems.length} sản phẩm đã chọn`"
            >
              Xóa sản phẩm đã chọn ({{ selectedItems.length }})
            </button>
          </div>

          <div class="text-right">
            <p class="text-sm text-gray-500">
              Đã chọn: {{ selectedItems.length }} sản phẩm
            </p>

            <p class="text-lg font-semibold">
              Tổng: {{ formatPrice(totalSelected) }}
            </p>
            <!-- Chọn coupon áp dụng trên tổng tiền -->
            <div class="mt-2 flex items-center justify-end gap-2">
              <button
                @click="
                  openCoupon = true;
                  loadCoupons();
                "
                class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
              >
                {{
                  selectedCoupon
                    ? `Đang áp dụng: ${selectedCoupon.code}`
                    : "Chọn mã giảm giá"
                }}
              </button>

              <!-- Nút huỷ -->
              <button
                v-if="selectedCoupon"
                @click="selectedCoupon = null"
                class="text-red-600 text-sm hover:underline"
              >
                Huỷ
              </button>
            </div>

            <p
              v-if="selectedCoupon"
              class="mt-2 text-green-600 font-semibold text-base"
            >
              Sau giảm: {{ formatPrice(totalSelectedAfterDiscount) }}
            </p>

            <!-- Cảnh báo vượt kho -->
            <div
              v-if="selectedItemsOutOfStock.length > 0"
              class="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm"
            >
              <p class="text-red-500">
                Một số sản phẩm đã chọn vượt quá kho. Vui lòng giảm số lượng để
                tiếp tục đặt hàng
              </p>
            </div>

            <!-- Nút đặt đơn -->
            <button
              @click="goToCheckout"
              class="inline-block mt-2 bg-black text-white px-6 py-2 rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!canCheckout"
              :title="
                !canCheckout
                  ? 'Vui lòng chọn sản phẩm và kiểm tra kho trước khi đặt đơn'
                  : ''
              "
            >
              Đặt đơn
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
  <!-- Coupon Modal -->
  <CouponModal
    :open="openCoupon"
    :coupons="coupons"
    :subtotal="totalSelected"
    @close="openCoupon = false"
    @select="applyCoupon"
  />
</template>

<script setup>
import { useAuthStore } from "@/stores/auth";
import CouponModal from "@/components/modals/couponModal.vue";

const config = useRuntimeConfig();
const auth = useAuthStore();
const cart = ref({ items: [] });
const loading = ref(true);

// --- State ---
const selectedItems = ref([]);
const selectAll = ref(false);

const openCoupon = ref(false);
const coupons = ref([]);
const selectedCoupon = ref(null);
const loadingCoupons = ref(false);

// --- Optimistic update state ---
const pendingUpdates = ref({}); // { itemId: { quantity, timer } }
const loadingItems = ref(new Set()); // Set of item IDs being updated

// --- Helpers ---
const formatPrice = (v) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    v || 0,
  );

// Tính tổng số lượng items hiện tại trong giỏ
const totalCartItems = computed(() => {
  return cart.value.items.reduce((sum, item) => sum + item.quantity, 0);
});

const totalSelected = computed(() =>
  cart.value.items
    .filter((i) => selectedItems.value.includes(i.id))
    .reduce((s, i) => s + Number(i.price) * i.quantity, 0),
);

const totalSelectedAfterDiscount = computed(() => {
  if (!selectedCoupon.value) return totalSelected.value;
  if (selectedCoupon.value.type === "percent") {
    return totalSelected.value * (1 - Number(selectedCoupon.value.value) / 100);
  }
  return totalSelected.value - Number(selectedCoupon.value.value);
});

// Kiểm tra items đã chọn có vượt quá kho không
const selectedItemsOutOfStock = computed(() => {
  return cart.value.items
    .filter((i) => selectedItems.value.includes(i.id))
    .filter((i) => i.quantity > (i.stock || 0));
});

// Kiểm tra có thể đặt đơn không
const canCheckout = computed(() => {
  return (
    selectedItems.value.length > 0 && selectedItemsOutOfStock.value.length === 0
  );
});

// --- Toggle chọn tất cả ---
const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedItems.value = cart.value.items.map((i) => i.id);
  } else {
    selectedItems.value = [];
  }
};

// --- Update số lượng với optimistic updates ---
const updateQuantityOptimistically = (item, action) => {
  const itemId = item.id;
  const originalQuantity = item.quantity;

  // Optimistic update - cập nhật UI ngay lập tức
  if (action === "increase") {
    item.quantity += 1;
  } else if (action === "decrease") {
    if (item.quantity <= 1) {
      // Xác nhận xóa
      const confirmed = confirm(
        `Bạn có chắc chắn muốn xóa "${item.productName}" (${item.colorName} - ${item.sizeName}) khỏi giỏ hàng?`,
      );
      if (!confirmed) {
        return; // Không làm gì nếu user hủy
      }
    }
    item.quantity = Math.max(0, item.quantity - 1);
  }

  // Clear timer cũ nếu có
  if (pendingUpdates.value[itemId]?.timer) {
    clearTimeout(pendingUpdates.value[itemId].timer);
  }

  // Set pending state
  pendingUpdates.value[itemId] = {
    quantity: item.quantity,
    originalQuantity,
    action,
  };

  // Debounce API call
  const timer = setTimeout(async () => {
    await executeQuantityUpdate(item, itemId, originalQuantity);
  }, 300); // Giảm từ 500ms xuống 300ms

  pendingUpdates.value[itemId].timer = timer;

  // Update header immediately for better UX
  updateCartHeader();
};

const executeQuantityUpdate = async (item, itemId, originalQuantity) => {
  try {
    loadingItems.value.add(itemId);

    const pendingData = pendingUpdates.value[itemId];
    if (!pendingData) return;

    // Determine action based on quantity change
    let action;
    if (pendingData.quantity > originalQuantity) {
      action = "increase";
    } else if (pendingData.quantity < originalQuantity) {
      action = "decrease";
    } else {
      // No change, skip API call
      return;
    }

    // Calculate how many times to perform the action
    const diff = Math.abs(pendingData.quantity - originalQuantity);

    // For efficiency, we'll call API once with the final quantity
    const res = await $fetch(`/cart/update-quantity/${item.variantId}`, {
      method: "PATCH",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      body: {
        action,
        targetQuantity: pendingData.quantity, // Send target quantity for server to handle
      },
    });

    // Update with server response
    if (res.data) {
      item.quantity = res.data.quantity;
    }

    // If quantity is 0, remove item from cart
    if (item.quantity === 0) {
      cart.value.items = cart.value.items.filter((i) => i.id !== itemId);
      selectedItems.value = selectedItems.value.filter((id) => id !== itemId);
    }
  } catch (error) {
    console.error("Lỗi update số lượng:", error);

    // Rollback on error
    item.quantity = originalQuantity;
    alert("Không thể cập nhật số lượng. Vui lòng thử lại.");
  } finally {
    // Cleanup
    loadingItems.value.delete(itemId);
    delete pendingUpdates.value[itemId];
    updateCartHeader();
  }
};

// Helper to update cart header
const updateCartHeader = () => {
  const newTotal = cart.value.items.reduce((sum, i) => sum + i.quantity, 0);
  if (process.client) {
    window.dispatchEvent(
      new CustomEvent("cart-updated", {
        detail: { count: newTotal },
      }),
    );
  }
};

const inc = (item) => updateQuantityOptimistically(item, "increase");
const dec = (item) => updateQuantityOptimistically(item, "decrease");

// --- Xóa sản phẩm ---
const removeItem = async (item) => {
  const confirmed = confirm(
    `Bạn có chắc chắn muốn xóa "${item.productName}" (${item.colorName} - ${item.sizeName}) khỏi giỏ hàng?`,
  );

  if (!confirmed) return;

  try {
    await $fetch(`/cart/remove/${item.variantId}`, {
      method: "DELETE",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    // Xóa item khỏi danh sách local
    cart.value.items = cart.value.items.filter((i) => i.id !== item.id);

    // Xóa khỏi danh sách đã chọn nếu có
    selectedItems.value = selectedItems.value.filter((id) => id !== item.id);

    // Cập nhật số lượng trong header
    const newTotal = cart.value.items.reduce((sum, i) => sum + i.quantity, 0);
    if (process.client) {
      window.dispatchEvent(
        new CustomEvent("cart-updated", {
          detail: { count: newTotal },
        }),
      );
    }
  } catch (e) {
    console.error("Lỗi xóa sản phẩm:", e);
    alert("Không thể xóa sản phẩm. Vui lòng thử lại.");
  }
};

const removeSelectedItems = async () => {
  if (selectedItems.value.length === 0) return;

  const selectedProducts = cart.value.items.filter((item) =>
    selectedItems.value.includes(item.id),
  );

  const confirmed = confirm(
    `Bạn có chắc chắn muốn xóa ${selectedItems.value.length} sản phẩm đã chọn khỏi giỏ hàng?`,
  );

  if (!confirmed) return;

  try {
    // Sử dụng API mới để xóa nhiều sản phẩm cùng lúc
    const variantIds = selectedProducts.map((item) => item.variantId);

    await $fetch("/cart/remove-multiple", {
      method: "DELETE",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      body: { variantIds },
    });

    // Cập nhật danh sách local
    cart.value.items = cart.value.items.filter(
      (item) => !selectedItems.value.includes(item.id),
    );

    // Reset danh sách đã chọn
    selectedItems.value = [];
    selectAll.value = false;

    // Cập nhật số lượng trong header
    const newTotal = cart.value.items.reduce((sum, i) => sum + i.quantity, 0);
    if (process.client) {
      window.dispatchEvent(
        new CustomEvent("cart-updated", {
          detail: { count: newTotal },
        }),
      );
    }
  } catch (e) {
    console.error("Lỗi xóa sản phẩm:", e);
    alert("Không thể xóa một số sản phẩm. Vui lòng thử lại.");
  }
};

// --- Load giỏ hàng ---
onMounted(async () => {
  try {
    const res = await $fetch("/cart/get-cart-items", {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    cart.value = res;
  } catch (e) {
    console.error("Lỗi lấy giỏ hàng:", e);
  } finally {
    loading.value = false;
  }
});

// --- Coupon ---
const applyCoupon = (coupon) => {
  selectedCoupon.value = coupon;
  openCoupon.value = false;
};

const loadCoupons = async () => {
  try {
    loadingCoupons.value = true;

    // Lấy danh sách variantIds từ item được chọn
    const variantIds = cart.value.items
      .filter((i) => selectedItems.value.includes(i.id))
      .map((i) => i.variantId);

    if (!variantIds.length) {
      coupons.value = [];
      return;
    }

    console.log("Variant IDs gửi API:", variantIds);

    // Gọi API coupons/available
    const res = await $fetch("/coupons/available", {
      method: "GET",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      params: { variantIds: variantIds.join(",") }, // query: ?variantIds=id1,id2
    });

    coupons.value = res;
  } catch (e) {
    console.error("Lỗi lấy coupons:", e);
    coupons.value = [];
  } finally {
    loadingCoupons.value = false;
  }
};
// --- Navigate to product detail ---
const goToProduct = (item) => {
  if (item.productId) {
    navigateTo(`/product/${item.productId}`);
  }
};

// --- Watch selectedItems ---
watch(selectedItems, async (newVal) => {
  if (!newVal.length) {
    selectedCoupon.value = null;
    coupons.value = [];
    return;
  }

  await loadCoupons();

  // Coupon cũ không hợp lệ thì reset
  if (
    selectedCoupon.value &&
    !coupons.value.some((c) => c.id === selectedCoupon.value.id)
  ) {
    selectedCoupon.value = null;
  }
});

const goToCheckout = () => {
  const items = cart.value.items
    .filter((i) => selectedItems.value.includes(i.id))
    .map((i) => ({
      variantId: i.variantId,
      productName: i.productName,
      variantName: `${i.colorName} ${i.sizeName}`,
      quantity: i.quantity,
      price: i.price,
      imageUrl: i.imageUrl,
    }));

  localStorage.setItem("checkoutItems", JSON.stringify(items));
  localStorage.setItem("checkoutFromCart", "true");
  if (!selectedCoupon.value) {
    localStorage.removeItem("checkoutCoupon");
  } else {
    localStorage.setItem(
      "checkoutCoupon",
      JSON.stringify(selectedCoupon.value),
    );
  }

  navigateTo("/checkout");
};

// --- Cleanup on unmount ---
onUnmounted(() => {
  // Clear all pending timers
  Object.values(pendingUpdates.value).forEach((update) => {
    if (update.timer) {
      clearTimeout(update.timer);
    }
  });
  pendingUpdates.value = {};
  loadingItems.value.clear();
});
</script>

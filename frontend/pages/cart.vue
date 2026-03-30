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

      <div v-else-if="auth.isLoggedIn && !auth.isCustomer" class="text-gray-500 py-10 text-center">
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-6 max-w-md mx-auto">
          <p class="text-amber-800 font-medium">Quyền truy cập bị hạn chế</p>
          <p class="text-amber-700 text-sm mt-2">Tính năng giỏ hàng chỉ dành cho tài khoản Khách hàng.</p>
          <NuxtLink to="/feed" class="mt-4 inline-block text-sm font-semibold text-amber-900 underline">Quay lại trang chủ</NuxtLink>
        </div>
      </div>

      <div v-else-if="!cart?.items?.length" class="text-gray-500">
        Giỏ hàng trống.
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="item in cart.items"
          :key="item.id"
          class="flex items-start sm:items-center gap-3 sm:gap-4 border rounded-lg p-3 sm:p-4 shadow-sm bg-white"
        >
          <!-- Checkbox chọn sản phẩm -->
          <input
            type="checkbox"
            v-model="selectedItems"
            :value="item.id"
            class="w-4 h-4 text-black border-gray-300 rounded mt-1 sm:mt-0"
          />

          <!-- Ảnh -->
          <div
            class="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 cursor-pointer"
            @click="goToProduct(item)"
          >
            <img
              :src="item.imageUrl"
              class="w-full h-full object-cover rounded hover:opacity-80 transition"
            />
          </div>

          <!-- Nội dung & Giá/Số lượng (Flex-col on mobile) -->
          <div class="flex-1 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0">
            <!-- Thông tin -->
            <div class="flex-1 min-w-0">
              <h2
                class="font-semibold text-sm sm:text-lg truncate cursor-pointer hover:text-gray-700 transition"
                @click="goToProduct(item)"
              >
                {{ item.productName }}
              </h2>
              <p class="text-xs sm:text-sm text-gray-500">
                Màu: {{ item.colorName }} · Size: {{ item.sizeName }}
              </p>
              <p class="text-[10px] sm:text-xs text-gray-400">
                Kho: {{ item.stock || 0 }} sản phẩm
              </p>
              <p
                v-if="item.quantity > (item.stock || 0)"
                class="text-[10px] sm:text-xs text-red-500 font-medium"
              >
                ⚠️ Vượt quá kho! Còn {{ item.stock || 0 }}
              </p>
            </div>

            <!-- Cụm Số lượng & Giá -->
            <div class="flex items-center justify-between sm:justify-end gap-4 sm:min-w-[200px]">
              <!-- Số lượng -->
              <div class="flex items-center space-x-2 relative scale-90 sm:scale-100">
                <button
                  @click="dec(item)"
                  class="w-8 h-8 flex items-center justify-center border rounded hover:bg-gray-100 transition-all duration-150"
                  :class="{ 'opacity-75': loadingItems.has(item.id) }"
                >
                  −
                </button>
                <div class="relative px-1 min-w-[1.5rem] text-center">
                  <span class="select-none font-medium">{{ item.quantity }}</span>
                  <div
                    v-if="loadingItems.has(item.id)"
                    class="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                  ></div>
                </div>
                <button
                  @click="inc(item)"
                  class="w-8 h-8 flex items-center justify-center border rounded hover:bg-gray-100 transition-all duration-150"
                  :class="{ 'opacity-75': loadingItems.has(item.id) }"
                >
                  +
                </button>
              </div>

              <!-- Giá -->
              <div class="sm:w-32 text-right font-bold text-gray-900 text-sm sm:text-base whitespace-nowrap">
                {{ formatPrice(item.price * item.quantity) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Tóm tắt -->
        <div class="mt-8 border-t pt-6 flex flex-col lg:flex-row lg:justify-between gap-6">
          <!-- Trái: Chọn tất cả & Xóa -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div class="flex items-center space-x-2">
              <input
                type="checkbox"
                v-model="selectAll"
                @change="toggleSelectAll"
                class="w-4 h-4 text-black border-gray-300 rounded"
              />
              <span class="text-sm sm:text-base text-gray-600">Chọn tất cả</span>
            </div>

            <button
              v-if="selectedItems.length > 0"
              @click="removeSelectedItems"
              class="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 text-xs sm:text-sm font-medium transition"
            >
              Xóa đã chọn ({{ selectedItems.length }})
            </button>
          </div>

          <!-- Phải: Tính tiền & Đặt đơn -->
          <div class="bg-gray-50 p-4 sm:p-6 rounded-xl flex flex-col gap-3 min-w-full sm:min-w-[350px]">
            <div class="flex justify-between items-center text-sm text-gray-500">
              <span>Đã chọn:</span>
              <span class="font-medium text-gray-900">{{ selectedItems.length }} sản phẩm</span>
            </div>

            <div class="flex justify-between items-center text-base sm:text-lg font-semibold">
              <span>Tạm tính:</span>
              <span>{{ formatPrice(totalSelected) }}</span>
            </div>

            <!-- Coupon -->
            <div class="space-y-2 mt-2">
              <div class="flex items-center justify-between gap-2">
                <button
                  @click="
                    openCoupon = true;
                    loadCoupons();
                  "
                  class="flex-1 px-4 py-2 bg-white border border-dashed border-green-500 text-green-700 rounded-lg hover:bg-green-50 text-sm font-medium transition"
                >
                  {{
                    selectedCoupon
                      ? `Mã: ${selectedCoupon.code}`
                      : "Chọn mã giảm giá"
                  }}
                </button>

                <button
                  v-if="selectedCoupon"
                  @click="selectedCoupon = null"
                  class="text-red-500 text-xs hover:underline"
                >
                  Huỷ
                </button>
              </div>

              <div
                v-if="selectedCoupon"
                class="flex justify-between items-center text-base sm:text-xl font-bold text-green-600"
              >
                <span>Tổng sau giảm:</span>
                <span>{{ formatPrice(totalSelectedAfterDiscount) }}</span>
              </div>
            </div>

            <!-- Cảnh báo vượt kho -->
            <div
              v-if="selectedItemsOutOfStock.length > 0"
              class="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600 leading-tight"
            >
              ⚠️ Một số sản phẩm vượt quá kho. Vui lòng giảm số lượng.
            </div>

            <!-- Nút đặt đơn -->
            <button
              @click="goToCheckout"
              class="w-full mt-2 bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-base sm:text-lg shadow-lg active:scale-[0.98] transition-all"
              :disabled="!canCheckout"
            >
              Đặt đơn ngay
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

  // --- Optimistic UI Update: Remove item immediately if quantity is 0 ---
  if (item.quantity === 0) {
    cart.value.items = cart.value.items.filter((i) => i.id !== itemId);
    selectedItems.value = selectedItems.value.filter((id) => id !== itemId);
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
    
    // Nếu sản phẩm đã bị xóa khỏi UI, tải lại giỏ hàng để khôi phục
    if (originalQuantity > 0 && !cart.value.items.some(i => i.id === itemId)) {
      await fetchCartItems();
    }
    
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

  // Optimistic UI Update: Xóa item ngay lập tức
  const originalItems = [...cart.value.items];
  const originalSelected = [...selectedItems.value];
  
  cart.value.items = cart.value.items.filter((i) => i.id !== item.id);
  selectedItems.value = selectedItems.value.filter((id) => id !== item.id);
  updateCartHeader();

  try {
    await $fetch(`/cart/remove/${item.variantId}`, {
      method: "DELETE",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
  } catch (e) {
    console.error("Lỗi xóa sản phẩm:", e);
    // Rollback trên lỗi
    cart.value.items = originalItems;
    selectedItems.value = originalSelected;
    updateCartHeader();
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

  // Optimistic UI Update: Xóa ngay lập tức
  const originalItems = [...cart.value.items];
  const originalSelected = [...selectedItems.value];
  const originalSelectAll = selectAll.value;

  cart.value.items = cart.value.items.filter(
    (item) => !selectedItems.value.includes(item.id),
  );
  selectedItems.value = [];
  selectAll.value = false;
  updateCartHeader();

  try {
    // Sử dụng API mới để xóa nhiều sản phẩm cùng lúc
    const variantIds = selectedProducts.map((item) => item.variantId);

    await $fetch("/cart/remove-multiple", {
      method: "DELETE",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      body: { variantIds },
    });
  } catch (e) {
    console.error("Lỗi xóa sản phẩm:", e);
    // Rollback trên lỗi
    cart.value.items = originalItems;
    selectedItems.value = originalSelected;
    selectAll.value = originalSelectAll;
    updateCartHeader();
    alert("Không thể xóa một số sản phẩm. Vui lòng thử lại.");
  }
};

// --- Load giỏ hàng ---
const fetchCartItems = async () => {
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
};

onMounted(async () => {
  await fetchCartItems();
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

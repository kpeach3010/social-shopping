<template>
  <div>
    <Header />

    <main class="container mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold mb-6">Giỏ hàng của bạn</h1>

      <div v-if="!cart?.items?.length" class="text-gray-500">
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
          <div class="w-20 h-20 flex-shrink-0">
            <img
              :src="item.imageUrl"
              class="w-full h-full object-cover rounded"
            />
          </div>

          <!-- Thông tin -->
          <div class="flex-1 min-w-0">
            <h2 class="font-semibold text-base sm:text-lg truncate">
              {{ item.productName }}
            </h2>
            <p class="text-sm text-gray-500">
              Màu: {{ item.colorName }} · Size: {{ item.sizeName }}
            </p>
            <p class="text-xs text-gray-400">SKU: {{ item.sku }}</p>
          </div>

          <!-- Số lượng -->
          <div class="flex items-center space-x-2">
            <button @click="dec(item)" class="px-2 py-1 border rounded">
              −
            </button>
            <span class="px-2">{{ item.quantity }}</span>
            <button @click="inc(item)" class="px-2 py-1 border rounded">
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
            <!-- Nút đặt đơn -->
            <button
              @click="goToCheckout"
              class="inline-block mt-2 bg-black text-white px-6 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
              :disabled="selectedItems.length === 0"
            >
              Đặt đơn
            </button>
          </div>
        </div>
      </div>
    </main>

    <Footer />
  </div>
  <!-- Coupon Modal -->
  <CouponModal
    :open="openCoupon"
    :coupons="coupons"
    @close="openCoupon = false"
    @select="applyCoupon"
  />
</template>

<script setup>
import Header from "@/components/header.vue";
import Footer from "@/components/footer.vue";
import { useAuthStore } from "@/stores/auth";
import CouponModal from "@/components/modals/couponModal.vue"; // ✅ nhớ đúng tên file

const config = useRuntimeConfig();
const auth = useAuthStore();
const cart = ref({ items: [] });

// --- State ---
const selectedItems = ref([]);
const selectAll = ref(false);

const openCoupon = ref(false);
const coupons = ref([]);
const selectedCoupon = ref(null);
const loadingCoupons = ref(false);

// --- Helpers ---
const formatPrice = (v) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    v || 0
  );

const subtotal = computed(() =>
  cart.value.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0)
);

const totalSelected = computed(() =>
  cart.value.items
    .filter((i) => selectedItems.value.includes(i.id))
    .reduce((s, i) => s + Number(i.price) * i.quantity, 0)
);

const totalSelectedAfterDiscount = computed(() => {
  if (!selectedCoupon.value) return totalSelected.value;
  if (selectedCoupon.value.type === "percent") {
    return totalSelected.value * (1 - Number(selectedCoupon.value.value) / 100);
  }
  return totalSelected.value - Number(selectedCoupon.value.value);
});

// --- Toggle chọn tất cả ---
const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedItems.value = cart.value.items.map((i) => i.id);
  } else {
    selectedItems.value = [];
  }
};

// --- Update số lượng ---
const updateQuantity = async (item, action) => {
  try {
    const res = await $fetch(`/cart/update-quantity/${item.variantId}`, {
      method: "PATCH",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      body: { action }, // "increase" | "decrease"
    });
    item.quantity = res.data.quantity;
  } catch (e) {
    console.error("Lỗi update số lượng:", e);
  }
};

const inc = (item) => updateQuantity(item, "increase");
const dec = (item) => updateQuantity(item, "decrease");

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
      JSON.stringify(selectedCoupon.value)
    );
  }

  navigateTo("/checkout");
};
</script>

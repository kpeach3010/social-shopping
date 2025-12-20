<template>
  <div>
    <main class="container mx-auto px-4 py-8">
      <!-- Nếu đặt đơn thành công -->
      <div
        v-if="orderInfo"
        class="bg-white shadow-md rounded-xl p-6 space-y-6 w-full max-w-2xl mx-auto"
      >
        <!-- Alert -->
        <div
          class="p-4 bg-green-100 border border-green-300 text-green-700 rounded-lg"
        >
          ✅ {{ orderInfo.message }}
        </div>

        <!-- Thông tin đơn -->
        <div>
          <h2 class="text-xl font-semibold mb-3">Thông tin đơn hàng</h2>
          <div
            class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700"
          >
            <p><strong>Mã đơn:</strong> {{ orderInfo.order.id }}</p>
            <p>
              <strong>Trạng thái:</strong>
              {{
                orderInfo.order.status === "pending"
                  ? "Chờ xác nhận"
                  : orderInfo.order.status
              }}
            </p>
            <p>
              <strong>Thanh toán:</strong> {{ orderInfo.order.paymentMethod }}
            </p>
            <p>
              <strong>Ngày đặt:</strong>
              {{ new Date(orderInfo.order.createdAt).toLocaleString("vi-VN") }}
            </p>
          </div>
        </div>

        <!-- Địa chỉ giao hàng -->
        <div>
          <h2 class="text-xl font-semibold mb-3">Địa chỉ giao hàng</h2>
          <div class="p-4 border rounded-lg bg-gray-50 text-sm text-gray-700">
            <p>
              <strong>{{ orderInfo.order.shippingName }}</strong> —
              {{ orderInfo.order.shippingPhone }}
            </p>
            <p>
              {{ orderInfo.order.addressDetail }}, {{ orderInfo.order.ward }},
              {{ orderInfo.order.district }}, {{ orderInfo.order.province }}
            </p>
          </div>
        </div>

        <!-- Sản phẩm -->
        <div>
          <h2 class="text-xl font-semibold mb-3">Sản phẩm</h2>
          <div
            v-for="it in orderInfo.orderItems"
            :key="it.variantId"
            class="flex items-center gap-4 border-b py-3"
          >
            <div class="w-16 h-16 flex-shrink-0">
              <img
                :src="it.imageUrl"
                class="w-full h-full object-cover rounded"
              />
            </div>
            <div class="flex-1">
              <p class="font-medium">{{ it.productName }}</p>
              <p class="text-sm text-gray-500">{{ it.variantName }}</p>
              <p class="text-sm text-gray-500">Số lượng: {{ it.quantity }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm text-gray-500">
                {{ formatPrice(it.price) }} /sp
              </p>
              <p class="font-semibold">
                {{ formatPrice(it.price * it.quantity) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Tổng kết -->
        <div class="border-t pt-4 space-y-1 text-sm">
          <div class="flex justify-between">
            <span>Tạm tính</span>
            <span>{{ formatPrice(orderInfo.order.subtotal) }}</span>
          </div>
          <div
            v-if="orderInfo.order.couponCode"
            class="flex justify-between text-green-600"
          >
            <span>Mã giảm giá: {{ orderInfo.order.couponCode }}</span>
            <span>- {{ formatPrice(orderInfo.order.discountTotal) }}</span>
          </div>
          <div class="flex justify-between">
            <span>Phí ship</span>
            <span>{{ formatPrice(orderInfo.order.shippingFee) }}</span>
          </div>
          <div class="flex justify-between font-bold text-lg border-t pt-2">
            <span>Tổng cộng</span>
            <span>{{ formatPrice(orderInfo.order.total) }}</span>
          </div>
        </div>
      </div>

      <!-- Form checkout -->
      <div
        v-else
        class="bg-white p-6 rounded-lg shadow space-y-6 w-full max-w-2xl mx-auto"
      >
        <!-- Tóm tắt sản phẩm -->
        <div>
          <h2 class="text-lg font-semibold mb-3">Sản phẩm đã chọn</h2>

          <div
            v-for="it in checkoutItems"
            :key="it.variantId"
            class="flex items-center gap-4 border-b py-3"
          >
            <div class="w-16 h-16 flex-shrink-0">
              <img
                :src="it.imageUrl"
                class="w-full h-full object-cover rounded"
              />
            </div>
            <div class="flex-1">
              <p class="font-medium">{{ it.productName }}</p>
              <p class="text-sm text-gray-500">{{ it.variantName }}</p>
              <p class="text-sm text-gray-500">Số lượng: {{ it.quantity }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm text-gray-500">
                {{ formatPrice(it.price) }} /sp
              </p>
              <p class="font-semibold">
                {{ formatPrice(it.price * it.quantity) }}
              </p>
            </div>
          </div>

          <!-- Tổng kết -->
          <div class="flex justify-between mt-3 font-semibold">
            <span>Tạm tính</span>
            <span>{{ formatPrice(subtotal) }}</span>
          </div>
          <div
            v-if="selectedCoupon"
            class="flex justify-between text-green-600 mt-1"
          >
            <span>Mã giảm giá: {{ selectedCoupon.code }}</span>
            <span>- {{ formatPrice(discountTotal) }}</span>
          </div>
          <div class="flex justify-between mt-2 text-lg font-bold">
            <span>Tổng cộng</span>
            <span>{{ formatPrice(total) }}</span>
          </div>

          <!-- Nút chọn coupon -->
          <div v-if="!fromCart" class="mt-4 text-right">
            <button
              @click="showCouponModal = true"
              class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Chọn mã giảm giá
            </button>
          </div>
        </div>

        <!-- Địa chỉ giao hàng -->
        <div>
          <h2 class="text-lg font-semibold mb-2">Địa chỉ giao hàng</h2>
          <div class="flex items-center gap-4 mb-3">
            <label class="flex items-center gap-2">
              <input type="radio" value="default" v-model="shippingMode" /> Dùng
              địa chỉ mặc định
            </label>
            <label class="flex items-center gap-2">
              <input type="radio" value="new" v-model="shippingMode" /> Nhập địa
              chỉ mới
            </label>
          </div>

          <div
            v-if="shippingMode === 'default'"
            class="p-4 border rounded bg-gray-50 text-sm text-gray-700"
          >
            <p>
              <strong>{{ auth.user?.fullName }}</strong> —
              {{ auth.user?.phone }}
            </p>
            <p>
              {{ auth.user?.addressDetail }}, {{ auth.user?.ward }},
              {{ auth.user?.district }}, {{ auth.user?.province }}
            </p>
          </div>

          <div
            v-if="shippingMode === 'new'"
            class="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <input
              v-model="shipping.name"
              placeholder="Họ tên"
              class="border rounded px-4 py-2"
            />
            <input
              v-model="shipping.phone"
              placeholder="Số điện thoại"
              class="border rounded px-4 py-2"
            />
            <input
              v-model="shipping.province"
              placeholder="Tỉnh/Thành phố"
              class="border rounded px-4 py-2"
            />
            <input
              v-model="shipping.district"
              placeholder="Quận/Huyện"
              class="border rounded px-4 py-2"
            />
            <input
              v-model="shipping.ward"
              placeholder="Phường/Xã"
              class="border rounded px-4 py-2"
            />
            <input
              v-model="shipping.addressDetail"
              placeholder="Địa chỉ chi tiết"
              class="border rounded px-4 py-2"
            />
          </div>
        </div>

        <!-- Nút đặt hàng -->
        <div class="text-right">
          <button
            @click="checkout"
            class="px-6 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
            :disabled="loading"
          >
            {{ loading ? "Đang xử lý..." : "Đặt đơn" }}
          </button>
        </div>
      </div>
    </main>

    <!-- Modal coupon -->
    <CouponModal
      :open="showCouponModal"
      :coupons="coupons"
      :selectedCoupon="selectedCoupon"
      @close="showCouponModal = false"
      @select="applyCoupon"
    />
  </div>
</template>

<script setup>
import CouponModal from "@/components/modals/couponModal.vue";
import { useAuthStore } from "@/stores/auth";

const config = useRuntimeConfig();
const auth = useAuthStore();

// state
const checkoutItems = ref([]);
const selectedCoupon = ref(null);
const coupons = ref([]);
const showCouponModal = ref(false);
const fromCart = ref(false);

const shippingMode = ref("default");
const shipping = reactive({
  name: "",
  phone: "",
  province: "",
  district: "",
  ward: "",
  addressDetail: "",
});

const orderInfo = ref(null);
const loading = ref(false);

// --- Tính toán ---
const subtotal = computed(() =>
  checkoutItems.value.reduce((s, i) => s + Number(i.price) * i.quantity, 0)
);

const discountTotal = computed(() => {
  if (!selectedCoupon.value) return 0;
  if (selectedCoupon.value.type === "percent") {
    return (subtotal.value * Number(selectedCoupon.value.value)) / 100;
  }
  if (selectedCoupon.value.type === "fixed") {
    return Number(selectedCoupon.value.value);
  }
  return 0;
});

const total = computed(() => subtotal.value - discountTotal.value + 20000); // shippingFee = 20k

const formatPrice = (v) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    v || 0
  );

// --- Load data từ localStorage ---
onMounted(async () => {
  checkoutItems.value = JSON.parse(localStorage.getItem("checkoutItems")) || [];
  fromCart.value = localStorage.getItem("checkoutFromCart") === "true";

  // Nếu từ giỏ hàng thì giữ coupon đã lưu
  const couponStr = localStorage.getItem("checkoutCoupon");
  if (couponStr) {
    try {
      selectedCoupon.value = JSON.parse(couponStr);
    } catch (e) {
      console.error("Không parse được coupon:", e);
    }
  }

  // Nếu mua ngay thì load coupon khả dụng từ API
  if (!fromCart.value && checkoutItems.value.length) {
    localStorage.removeItem("checkoutCoupon");
    try {
      const variantIds = checkoutItems.value.map((i) => i.variantId).join(",");
      coupons.value = await $fetch(
        `/coupons/available?variantIds=${variantIds}`,
        {
          method: "GET",
          baseURL: config.public.apiBase,
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        }
      );
    } catch (e) {
      console.error("Lỗi load coupon:", e);
    }
  }
});

// --- Chọn coupon từ modal ---
const applyCoupon = (c) => {
  selectedCoupon.value = c;
  showCouponModal.value = false;
  localStorage.setItem("checkoutCoupon", JSON.stringify(c));
};

// --- Checkout ---
const checkout = async () => {
  if (!checkoutItems.value.length) {
    alert("Bạn chưa chọn sản phẩm nào!");
    return;
  }

  loading.value = true;
  try {
    const payload = {
      items: checkoutItems.value.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
      })),
      couponCode: selectedCoupon.value ? selectedCoupon.value.code : null,
      shipping:
        shippingMode.value === "new"
          ? shipping
          : {
              name: auth.user?.fullName,
              phone: auth.user?.phone,
              province: auth.user?.province,
              district: auth.user?.district,
              ward: auth.user?.ward,
              addressDetail: auth.user?.addressDetail,
            },
      paymentMethod: "COD",
      fromCart: fromCart.value,
    };

    const res = await $fetch("/orders/checkout", {
      method: "POST",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      body: payload,
    });

    orderInfo.value = res;

    if (fromCart.value && process.client) {
      window.dispatchEvent(new CustomEvent("cart-updated"));
    }

    // Xóa localStorage sau khi đặt hàng xong
    localStorage.removeItem("checkoutItems");
    localStorage.removeItem("checkoutCoupon");
    localStorage.removeItem("checkoutFromCart");
  } catch (e) {
    console.error("Checkout error:", e);
    if (e.response?._data?.error) {
      alert(e.response._data.error);
    } else {
      alert("Có lỗi khi đặt đơn, vui lòng thử lại.");
    }
  } finally {
    loading.value = false;
  }
};
</script>

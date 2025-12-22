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
        <div
          v-if="orderInfo.order.isPaid && orderInfo.order.status === 'pending'"
          class="bg-blue-50 text-blue-700 p-4 rounded"
        >
          Chúng tôi đã nhận được thanh toán của bạn.
        </div>

        <!-- Phương thức thanh toán -->
        <div>
          <h2 class="text-lg font-semibold mb-3">Phương thức thanh toán</h2>
          <div class="space-y-3">
            <label
              class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all"
              :class="
                paymentMethod === 'COD'
                  ? 'border-black bg-gray-50 ring-1 ring-black'
                  : 'border-gray-200 hover:border-gray-400'
              "
            >
              <input
                type="radio"
                value="COD"
                v-model="paymentMethod"
                class="w-5 h-5 accent-black"
              />
              <div class="flex-1">
                <div class="font-semibold">Thanh toán khi nhận hàng (COD)</div>
                <div class="text-xs text-gray-500">
                  Thanh toán tiền mặt khi shipper giao hàng
                </div>
              </div>
            </label>

            <label
              class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all"
              :class="
                paymentMethod === 'MOMO'
                  ? 'border-pink-500 bg-pink-50 ring-1 ring-pink-500'
                  : 'border-gray-200 hover:border-pink-300'
              "
            >
              <input
                type="radio"
                value="MOMO"
                v-model="paymentMethod"
                class="w-5 h-5 accent-pink-600"
              />
              <div class="flex-1">
                <div
                  class="font-semibold text-pink-700 flex items-center gap-2"
                >
                  Ví MoMo / QR Code
                  <!-- <span
                    class="bg-pink-100 text-pink-800 text-xs px-2 py-0.5 rounded"
                    >Khuyên dùng</span
                  > -->
                </div>
                <div class="text-xs text-gray-500">
                  Quét mã QR bằng ứng dụng MoMo
                </div>
              </div>
              <img
                src="https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png"
                class="w-8 h-8 object-contain rounded"
              />
            </label>
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
            <button
              @click="removeCoupon"
              class="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 hover:bg-red-50 rounded"
            >
              ✕ Xóa
            </button>
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

        <div class="mt-6 border-t pt-4">
          <h2 class="text-lg font-semibold mb-3">Phương thức thanh toán</h2>
          <div class="space-y-3">
            <label
              class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all"
              :class="
                paymentMethod === 'COD'
                  ? 'border-black bg-gray-50 ring-1 ring-black'
                  : 'border-gray-200 hover:border-gray-400'
              "
            >
              <input
                type="radio"
                value="COD"
                v-model="paymentMethod"
                class="w-5 h-5 accent-black"
              />
              <div class="flex-1">
                <div class="font-semibold">Thanh toán khi nhận hàng (COD)</div>
                <div class="text-xs text-gray-500">
                  Thanh toán tiền mặt khi shipper giao hàng
                </div>
              </div>
            </label>

            <label
              class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all"
              :class="
                paymentMethod === 'MOMO'
                  ? 'border-pink-500 bg-pink-50 ring-1 ring-pink-500'
                  : 'border-gray-200 hover:border-pink-300'
              "
            >
              <input
                type="radio"
                value="MOMO"
                v-model="paymentMethod"
                class="w-5 h-5 accent-pink-600"
              />
              <div class="flex-1">
                <div
                  class="font-semibold text-pink-700 flex items-center gap-2"
                >
                  Ví MoMo / QR Code
                  <span
                    class="bg-pink-100 text-pink-800 text-xs px-2 py-0.5 rounded"
                    >Khuyên dùng</span
                  >
                </div>
                <div class="text-xs text-gray-500">
                  Quét mã QR bằng ứng dụng MoMo
                </div>
              </div>
              <img
                src="https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png"
                class="w-8 h-8 object-contain rounded"
              />
            </label>

            <label
              class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all"
              :class="
                paymentMethod === 'VNPAY'
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                  : 'border-gray-200 hover:border-blue-300'
              "
            >
              <input
                type="radio"
                value="VNPAY"
                v-model="paymentMethod"
                class="w-5 h-5 accent-blue-600"
              />
              <div class="flex-1">
                <div
                  class="font-semibold text-blue-700 flex items-center gap-2"
                >
                  VNPay / Ngân hàng
                  <span
                    class="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded"
                    >Ổn định</span
                  >
                </div>
                <div class="text-xs text-gray-500">
                  Thẻ ATM nội địa, Thẻ quốc tế, Internet Banking
                </div>
              </div>
              <img
                src="https://sandbox.vnpayment.vn/paymentv2/images/logo.png"
                class="h-6 object-contain"
              />
            </label>
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
        <div class="text-right border-t pt-4">
          <button
            @click="checkout"
            class="px-6 py-3 text-white rounded-lg font-medium shadow hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2 ml-auto"
            :class="{
              'bg-pink-600 hover:bg-pink-700': paymentMethod === 'MOMO',
              'bg-blue-600 hover:bg-blue-700': paymentMethod === 'VNPAY',
              'bg-black hover:bg-gray-800': paymentMethod === 'COD',
            }"
            :disabled="loading"
          >
            <span v-if="loading" class="animate-spin text-xl">⏳</span>
            <span v-else>
              {{
                paymentMethod === "MOMO"
                  ? "Thanh toán MoMo"
                  : paymentMethod === "VNPAY"
                  ? "Thanh toán VNPay"
                  : "Đặt đơn ngay"
              }}
            </span>
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
const route = useRoute();
// state
const checkoutItems = ref([]);
const selectedCoupon = ref(null);
const coupons = ref([]);
const showCouponModal = ref(false);
const fromCart = ref(false);
const paymentMethod = ref("COD");

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
  // 1. Kiểm tra nếu là VNPay redirect về
  if (route.query.vnp_ResponseCode) {
    await handleVnpayCallback();
  } else {
    // 2. Nếu không phải, load giỏ hàng để khách mua
    initCart();
  }
});

// --- Chọn coupon từ modal ---
const applyCoupon = (c) => {
  selectedCoupon.value = c;
  showCouponModal.value = false;
  localStorage.setItem("checkoutCoupon", JSON.stringify(c));
};

// Hàm xóa coupon
const removeCoupon = () => {
  selectedCoupon.value = null;
  localStorage.removeItem("checkoutCoupon");
};

// --- Checkout ---
const checkout = async () => {
  if (!checkoutItems.value.length) {
    alert("Bạn chưa chọn sản phẩm nào!");
    return;
  }

  loading.value = true;
  try {
    // 1. Tạo đơn hàng trước (Lưu vào DB với trạng thái Pending)
    // Dù thanh toán lỗi thì đơn vẫn phải tồn tại trong DB để có ID gửi sang MoMo
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
      paymentMethod: paymentMethod.value,
      fromCart: fromCart.value,
    };

    const resOrder = await $fetch("/orders/checkout", {
      method: "POST",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      body: payload,
    });

    // 2. Phân chia luồng xử lý
    if (paymentMethod.value === "MOMO") {
      // Thanh toán MoMo
      try {
        const resPayment = await $fetch("/payment/momo/create", {
          method: "POST",
          baseURL: config.public.apiBase,
          headers: { Authorization: `Bearer ${auth.accessToken}` },
          body: {
            orderId: resOrder.order.id,
            amount: Math.round(resOrder.order.total),
            redirectUrl: window.location.origin + "/payment/momo-return",
          },
        });

        if (resPayment.paymentUrl) {
          // Chỉ khi có link thanh toán mới xóa giỏ hàng
          // cleanUpCart();
          // Chuyển hướng ngay, KHÔNG gán orderInfo để không hiện bảng thành công
          window.location.href = resPayment.paymentUrl;
        } else {
          // Trường hợp API không trả về link (Lỗi bên MoMo hoặc Server)
          throw new Error("Không nhận được link thanh toán từ MoMo");
        }
      } catch (errMomo) {
        console.error("Lỗi tạo link MoMo:", errMomo);
        alert(
          "Hệ thống thanh toán MoMo đang gặp sự cố. Vui lòng chọn 'COD' hoặc thử lại sau."
        );
      }
    } // --- VNPAY ---
    else if (paymentMethod.value === "VNPAY") {
      try {
        const resPayment = await $fetch("/payment/vnpay/create", {
          method: "POST",
          baseURL: config.public.apiBase,
          headers: { Authorization: `Bearer ${auth.accessToken}` },
          body: {
            orderId: resOrder.order.id,
            amount: Math.round(resOrder.order.total),
          },
        });

        if (resPayment.paymentUrl) {
          window.location.href = resPayment.paymentUrl;
        } else {
          throw new Error("Không nhận được link thanh toán từ VNPay");
        }
      } catch (errVnpay) {
        console.error("Lỗi tạo link VNPay:", errVnpay);
        alert("Lỗi kết nối VNPay. Vui lòng thử phương thức khác.");
      }
    } else {
      // Thanh toán COD
      // Gán orderInfo để hiện thông báo thành công
      orderInfo.value = resOrder;

      if (fromCart.value && process.client) {
        window.dispatchEvent(new CustomEvent("cart-updated"));
      }
      cleanUpCart();
    }
  } catch (e) {
    console.error("Checkout error:", e);
    if (e.response?._data?.error) {
      alert(e.response._data.error);
    } else {
      alert("Có lỗi khi tạo đơn hàng, vui lòng thử lại.");
    }
  } finally {
    loading.value = false;
  }
};

// Xử lý khi VNPay trả về
const handleVnpayCallback = async () => {
  loading.value = true;
  try {
    // Bước 1: Verify chữ ký với Backend
    const verifyRes = await $fetch("/payment/vnpay/return", {
      method: "GET",
      baseURL: config.public.apiBase,
      params: route.query,
    });

    if (verifyRes.code === "00") {
      // Bước 2: Nếu chữ ký đúng & thanh toán thành công -> Lấy chi tiết đơn hàng để hiện bill
      // Giả sử bạn có API GET /orders/:id để lấy lại thông tin đơn vừa thanh toán
      // Nếu không có API này, bạn buộc phải fake object orderInfo (xem chú thích dưới *)
      const orderId = route.query.vnp_TxnRef;
      const orderDetail = await $fetch(`/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
        baseURL: config.public.apiBase,
      });

      orderInfo.value = {
        message: "Thanh toán VNPay thành công!",
        ...orderDetail, // Gán dữ liệu vào để hiển thị UI
      };

      cleanUpCart(); // Xóa giỏ hàng
    } else {
      alert(`Thanh toán thất bại: ${verifyRes.message}`);
      initCart(); // Cho phép thanh toán lại
    }
  } catch (e) {
    console.error(e);
    alert("Có lỗi khi xác thực thanh toán.");
    initCart();
  } finally {
    loading.value = false;
  }
};

// Khởi tạo giỏ hàng
const initCart = async () => {
  checkoutItems.value = JSON.parse(localStorage.getItem("checkoutItems")) || [];
  fromCart.value = localStorage.getItem("checkoutFromCart") === "true";

  // Load coupon nếu có
  const couponStr = localStorage.getItem("checkoutCoupon");
  if (couponStr) selectedCoupon.value = JSON.parse(couponStr);

  // Load danh sách coupon khả dụng (nếu mua ngay)
  if (!fromCart.value && checkoutItems.value.length) {
    localStorage.removeItem("checkoutCoupon");
    const variantIds = checkoutItems.value.map((i) => i.variantId).join(",");
    try {
      coupons.value = await $fetch(
        `/coupons/available?variantIds=${variantIds}`,
        {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
          baseURL: config.public.apiBase,
        }
      );
    } catch (e) {}
  }
};

const cleanUpCart = () => {
  localStorage.removeItem("checkoutItems");
  localStorage.removeItem("checkoutCoupon");
  localStorage.removeItem("checkoutFromCart");
};
</script>

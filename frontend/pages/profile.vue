<template>
  <div>
    <main class="container mx-auto px-6 py-12 flex gap-8">
      <!-- Sidebar -->
      <aside class="w-1/4">
        <div class="bg-white rounded-2xl shadow-md p-4">
          <h3 class="text-lg font-semibold mb-4 text-gray-700">
            Tài khoản của tôi
          </h3>
          <nav class="space-y-2">
            <button
              class="w-full flex items-center gap-2 px-4 py-3 rounded-lg transition"
              :class="
                currentTab === 'profile'
                  ? 'bg-black text-white shadow-md'
                  : 'hover:bg-gray-100 text-gray-700'
              "
              @click="currentTab = 'profile'"
            >
              <i class="bx bx-user text-xl"></i>
              <span>Thông tin cá nhân</span>
            </button>
            <button
              v-if="auth.user?.role !== 'staff'"
              class="w-full flex items-center gap-2 px-4 py-3 rounded-lg transition"
              :class="
                currentTab === 'orders'
                  ? 'bg-black text-white shadow-md'
                  : 'hover:bg-gray-100 text-gray-700'
              "
              @click="currentTab = 'orders'"
            >
              <i class="bx bx-package text-xl"></i>
              <span>Lịch sử đơn hàng</span>
            </button>
          </nav>
        </div>
      </aside>

      <!-- Nội dung -->
      <section class="flex-1">
        <!-- Tab Thông tin cá nhân -->
        <div
          v-if="currentTab === 'profile'"
          class="bg-white rounded-2xl shadow-xl p-8"
        >
          <h2
            class="text-2xl font-bold mb-8 text-gray-800 flex items-center gap-2"
          >
            <i class="bx bx-user-circle text-3xl text-black"></i>
            Thông tin cá nhân
          </h2>

          <div class="flex flex-col items-center mb-6">
            <!-- Avatar -->
            <div
              class="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center shadow-md"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="w-12 h-12 text-gray-500"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                />
              </svg>
            </div>

            <!-- Tên user -->
            <h2 class="mt-3 text-lg font-semibold text-gray-800">
              {{ auth.user?.fullName }}
            </h2>
          </div>

          <!-- Thông tin chi tiết -->
          <div class="space-y-4 text-gray-700">
            <div>
              <p class="text-sm text-gray-500">Số điện thoại</p>
              <p class="font-medium">{{ auth.user?.phone }}</p>
            </div>

            <div>
              <p class="text-sm text-gray-500">Email</p>
              <p class="font-medium">{{ auth.user?.email }}</p>
            </div>

            <div>
              <p class="text-sm text-gray-500">Giới tính</p>
              <p class="font-medium">
                {{
                  auth.user?.gender === "male"
                    ? "Nam"
                    : auth.user?.gender === "female"
                      ? "Nữ"
                      : ""
                }}
              </p>
            </div>

            <div>
              <p class="text-sm text-gray-500">Địa chỉ</p>
              <p class="font-medium">
                {{ auth.user?.addressDetail }}, {{ auth.user?.ward }},
                {{ auth.user?.district }}, {{ auth.user?.province }}
              </p>
            </div>
          </div>
          <!-- Nút mở modal cập nhật -->
          <div class="mt-6 flex justify-end">
            <button
              class="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900"
              @click="openEditProfile"
            >
              Cập nhật thông tin
            </button>
          </div>
        </div>

        <!-- Tab Lịch sử đơn hàng -->
        <div v-else class="bg-white rounded-2xl shadow-md p-6">
          <h2 class="text-xl font-semibold mb-6 text-gray-800">
            Lịch sử đơn hàng
          </h2>

          <!-- Tabs trạng thái -->
          <div class="flex gap-3 border-b mb-6">
            <button
              v-for="st in statuses"
              :key="st.value"
              class="px-4 py-2 text-sm font-medium transition"
              :class="
                selectedStatus === st.value
                  ? 'border-b-2 border-black text-black font-semibold'
                  : 'text-gray-500 hover:text-black'
              "
              @click="selectStatus(st.value)"
            >
              {{ st.label }}
            </button>
          </div>

          <!-- Danh sách đơn -->
          <!-- Thông báo cho tab chờ thanh toán -->
          <div
            v-if="selectedStatus === 'awaiting_payment'"
            class="mb-4 flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-700"
          >
            <svg
              class="w-5 h-5 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span
              >Trong trường hợp chờ thanh toán, Shop chỉ giữ đơn trong
              <strong>30 phút</strong> kể từ khi đặt đơn. Sau thời gian này, đơn
              hàng sẽ tự động bị hủy.</span
            >
          </div>

          <div v-if="paginatedOrders.length" class="space-y-6">
            <div
              v-for="o in paginatedOrders"
              :key="o.id"
              class="border rounded-xl p-4 shadow-sm hover:shadow-md transition"
            >
              <!-- Header đơn hàng -->
              <div class="flex justify-between items-center mb-3">
                <h3 class="font-semibold">Mã đơn: {{ o.id }}</h3>
                <span
                  class="px-3 py-1 rounded-full text-sm"
                  :class="{
                    'bg-orange-100 text-orange-700':
                      o.status === 'awaiting_payment',
                    'bg-yellow-100 text-yellow-700': o.status === 'pending',
                    'bg-blue-100 text-blue-700': o.status === 'confirmed',
                    'bg-red-100 text-red-700': o.status === 'rejected',
                    'bg-green-100 text-green-700': o.status === 'completed',
                    'bg-gray-100 text-gray-700': o.status === 'cancelled',
                  }"
                >
                  {{ statuses.find((s) => s.value === o.status)?.label }}
                </span>
              </div>

              <!-- Thông tin chính -->
              <p class="text-sm text-gray-500 mb-2">
                Ngày đặt: {{ new Date(o.createdAt).toLocaleString("vi-VN") }}
              </p>

              <p class="text-sm text-gray-600">
                Thanh toán:
                <span class="font-medium">{{ o.paymentMethod }}</span>
              </p>

              <p class="text-sm text-gray-600">
                Loại đơn:
                <span class="font-medium">{{ orderTypeLabel(o) }}</span>
              </p>

              <!-- Sản phẩm trong đơn -->
              <div
                v-for="item in o.items"
                :key="item.id"
                class="flex items-center gap-4"
              >
                <img
                  :src="item.imageUrl"
                  class="w-16 h-16 rounded object-cover border"
                />
                <div class="flex-1">
                  <p class="font-medium">{{ item.productName }}</p>
                  <p class="text-sm text-gray-500">
                    {{ item.variantName }} × {{ item.quantity }}
                  </p>
                </div>
                <div class="flex flex-col items-end gap-2">
                  <p class="font-semibold">{{ formatPrice(item.price) }}</p>
                  <button
                    v-if="o.status === 'completed' && !item.hasReview"
                    @click.stop="openReviewModal(item)"
                    class="px-3 py-1 bg-white border border-black text-black text-xs hover:bg-black hover:text-white transition rounded-none"
                  >
                    Đánh giá
                  </button>
                </div>
              </div>

              <!-- Tổng tiền + nút -->
              <div class="mt-4 flex justify-between items-center">
                <p class="text-gray-600">
                  Tổng cộng:
                  <span class="font-bold">{{ formatPrice(o.total) }}</span>
                </p>
                <div class="flex gap-3">
                  <button
                    class="px-4 py-2 rounded border text-gray-700 hover:bg-gray-100"
                    @click="viewOrderDetail(o.id)"
                  >
                    Xem chi tiết
                  </button>
                  <button
                    v-if="o.status === 'awaiting_payment'"
                    class="px-4 py-2 rounded bg-yellow-500 text-white hover:bg-yellow-600 font-medium"
                    @click="openPaymentModal(o)"
                  >
                    Thanh toán
                  </button>
                  <button
                    v-if="
                      o.status === 'awaiting_payment' &&
                      o.paymentMethod !== 'COD' &&
                      o.couponKind !== 'group'
                    "
                    class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 font-medium"
                    @click="changePaymentToCod(o.id)"
                  >
                    Đổi sang COD
                  </button>
                  <button
                    v-if="
                      (o.status === 'pending' ||
                        o.status === 'awaiting_payment') &&
                      o.couponKind !== 'group'
                    "
                    class="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                    @click="cancelOrder(o.id)"
                  >
                    Hủy đơn hàng
                  </button>
                </div>
              </div>
            </div>

            <!-- Phân trang -->
            <div v-if="totalPages > 1" class="flex justify-center mt-6 gap-2">
              <button
                class="px-3 py-1 rounded border hover:bg-gray-100 disabled:opacity-40"
                :disabled="currentPage === 1"
                @click="prevPage"
              >
                ‹
              </button>
              <button
                v-for="p in pages"
                :key="p"
                class="px-3 py-1 rounded border"
                :class="
                  currentPage === p
                    ? 'bg-black text-white'
                    : 'hover:bg-gray-100'
                "
                @click="goToPage(p)"
              >
                {{ p }}
              </button>
              <button
                class="px-3 py-1 rounded border hover:bg-gray-100 disabled:opacity-40"
                :disabled="currentPage === totalPages"
                @click="nextPage"
              >
                ›
              </button>
            </div>
          </div>

          <!-- Không có đơn -->
          <div
            v-if="!paginatedOrders.length"
            class="text-gray-500 text-center py-10"
          >
            Không có đơn hàng nào ở trạng thái này.
          </div>
        </div>
      </section>
    </main>

    <!-- Popup chi tiết đơn -->
    <div
      v-if="showDetail"
      class="fixed inset-0 flex items-center justify-center z-50"
    >
      <!-- Overlay mờ nền -->
      <div
        class="absolute inset-0 bg-black/30 backdrop-blur-sm"
        @click="closeDetail"
      ></div>

      <!-- Khung popup -->
      <div
        class="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden z-10 border"
      >
        <!-- Header cố định -->
        <div
          class="sticky top-0 bg-white z-20 border-b px-6 py-4 flex justify-between items-center"
        >
          <h2 class="text-xl font-bold text-gray-800">Chi tiết đơn hàng</h2>
          <button
            class="text-gray-400 hover:text-black text-xl"
            @click="closeDetail"
          >
            ✕
          </button>
        </div>

        <!-- Nội dung có thể scroll -->
        <div class="p-6 overflow-y-auto max-h-[70vh] pb-24">
          <div v-if="orderDetail" class="space-y-4 text-gray-700">
            <p><strong>Người nhận:</strong> {{ orderDetail.shippingName }}</p>
            <p>
              <strong>Số điện thoại:</strong> {{ orderDetail.shippingPhone }}
            </p>
            <p>
              <strong>Địa chỉ:</strong>
              {{ orderDetail.addressDetail }}, {{ orderDetail.ward }},
              {{ orderDetail.district }}, {{ orderDetail.province }}
            </p>
            <p>
              <strong>Ngày đặt:</strong>
              {{ new Date(orderDetail.createdAt).toLocaleString("vi-VN") }}
            </p>
            <!-- Hiển thị coupon nếu có -->
            <p v-if="orderDetail.couponCode">
              <strong>Mã giảm giá:</strong> {{ orderDetail.couponCode }}
            </p>
            <p><strong>Thanh toán:</strong> {{ orderDetail.paymentMethod }}</p>

            <p v-if="orderDetail.couponCode">
              <strong>Mã giảm giá:</strong> {{ orderDetail.couponCode }}
            </p>

            <!-- Danh sách sản phẩm -->
            <div class="mt-6">
              <h3 class="font-semibold mb-2">Sản phẩm</h3>
              <div class="divide-y border rounded-lg">
                <div
                  v-for="item in orderDetail.items"
                  :key="item.id"
                  class="flex items-center gap-4 p-3"
                >
                  <img
                    :src="item.imageUrl"
                    class="w-16 h-16 object-cover border rounded-lg"
                  />
                  <div class="flex-1">
                    <p class="font-medium">{{ item.productName }}</p>
                    <p class="text-sm text-gray-500">
                      {{ item.variantName }} × {{ item.quantity }}
                    </p>
                  </div>
                  <p class="font-semibold">{{ formatPrice(item.price) }}</p>
                </div>
              </div>
            </div>

            <!-- Tổng tiền -->
            <div class="mt-6 text-right space-y-1">
              <p>Tạm tính: {{ formatPrice(orderDetail.subtotal) }}</p>
              <p>Phí vận chuyển: {{ formatPrice(orderDetail.shippingFee) }}</p>
              <p>Giảm giá: {{ formatPrice(orderDetail.discountTotal) }}</p>
              <p class="font-bold text-lg text-gray-900">
                Tổng cộng: {{ formatPrice(orderDetail.total) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="sticky bottom-0 bg-white border-t px-6s py-4 text-right">
          <button
            v-if="orderDetail?.status === 'awaiting_payment'"
            class="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 mr-2"
            @click="openPaymentModal(orderDetail)"
          >
            Thanh toán
          </button>
          <button
            v-if="
              orderDetail?.status === 'awaiting_payment' &&
              orderDetail?.paymentMethod !== 'COD' &&
              orderDetail?.couponKind !== 'group'
            "
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
            @click="changePaymentToCod(orderDetail.id)"
          >
            Đổi sang COD
          </button>
          <button
            v-if="
              (orderDetail?.status === 'pending' ||
                orderDetail?.status === 'awaiting_payment') &&
              orderDetail?.couponKind !== 'group'
            "
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 mr-2"
            @click="cancelOrder(orderDetail.id)"
          >
            Hủy đơn hàng
          </button>
        </div>
      </div>
    </div>
  </div>
  <ProfileModal
    :show="showEditProfile"
    :userData="auth.user"
    @close="closeEditProfile"
    @refresh="auth.loadFromStorage()"
  />

  <ReviewModal ref="reviewModalRef" @submitted="onReviewSubmitted" />

  <PaymentQrModal ref="paymentModalRef" @paid="onPaymentSuccess" />

  <!-- Toast thông báo thanh toán thành công -->
  <Transition name="fade">
    <div
      v-if="paymentSuccessMessage"
      class="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium"
    >
      <svg
        class="w-5 h-5 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M5 13l4 4L19 7"
        />
      </svg>
      {{ paymentSuccessMessage }}
    </div>
  </Transition>
</template>

<script setup>
import { useAuthStore } from "@/stores/auth";
import ProfileModal from "@/components/modals/ProfileModal.vue";
import ReviewModal from "@/components/modals/ReviewModal.vue";
import PaymentQrModal from "@/components/modals/PaymentQrModal.vue";

const auth = useAuthStore();
const config = useRuntimeConfig();

// Tab
const currentTab = ref("profile");

// Orders
const orders = ref([]);
const selectedStatus = ref("pending");

// Popup
const showDetail = ref(false);
const orderDetail = ref(null);

// Modal cập nhật thông tin cá nhân
const showEditProfile = ref(false);

// Modal đánh giá
const reviewModalRef = ref(null);

// Modal thanh toán QR
const paymentModalRef = ref(null);

// Mở/đóng modal cập nhật
const openEditProfile = () => {
  showEditProfile.value = true;
};

// Đóng modal cập nhật
const closeEditProfile = () => {
  showEditProfile.value = false;
};

const statuses = [
  { value: "awaiting_payment", label: "Chờ thanh toán" },
  { value: "pending", label: "Đang chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "rejected", label: "Bị từ chối" },
  { value: "completed", label: "Đã hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
];

// Pagination
const currentPage = ref(1);
const perPage = 5;

const route = useRoute();

onMounted(async () => {
  // Đọc query params để chuyển đúng tab (vd: từ thông báo click vào)
  if (route.query.tab === "orders") {
    currentTab.value = "orders";
  }
  if (route.query.status) {
    const validStatus = statuses.find((s) => s.value === route.query.status);
    if (validStatus) {
      selectedStatus.value = validStatus.value;
    }
  }

  try {
    const res = await $fetch("/orders/my-orders", {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    orders.value = res;
  } catch (e) {
    console.error("Lỗi tải đơn hàng:", e);
  }
});

const filteredOrders = computed(() => {
  return orders.value
    .filter((o) => o.status === selectedStatus.value)
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
});

const totalPages = computed(() =>
  Math.ceil(filteredOrders.value.length / perPage),
);

const paginatedOrders = computed(() => {
  const start = (currentPage.value - 1) * perPage;
  return filteredOrders.value.slice(start, start + perPage);
});

const pages = computed(() =>
  Array.from({ length: totalPages.value }, (_, i) => i + 1),
);

const goToPage = (p) => {
  if (p >= 1 && p <= totalPages.value) currentPage.value = p;
};
const prevPage = () => goToPage(currentPage.value - 1);
const nextPage = () => goToPage(currentPage.value + 1);

const selectStatus = (status) => {
  selectedStatus.value = status;
  currentPage.value = 1;
};

// Xem chi tiết
const viewOrderDetail = async (orderId) => {
  try {
    const res = await $fetch(`/orders/my-orders/${orderId}`, {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    orderDetail.value = res;
    showDetail.value = true;
  } catch (e) {
    console.error("Lỗi xem chi tiết:", e);
  }
};
const closeDetail = () => {
  showDetail.value = false;
  orderDetail.value = null;
};

// Hủy đơn
const cancelOrder = async (orderId) => {
  // Tìm đơn để kiểm tra có coupon không
  const order =
    orders.value.find((o) => o.id === orderId) ||
    (orderDetail.value?.id === orderId ? orderDetail.value : null);

  const hasCoupon = !!order?.couponCode;

  const confirmMsg = hasCoupon
    ? "Bạn có chắc muốn hủy đơn hàng này?\n\n⚠️ Lưu ý: Mã giảm giá sẽ không được hoàn khi bạn hủy đơn."
    : "Bạn có chắc muốn hủy đơn hàng này?";

  if (!confirm(confirmMsg)) return;

  try {
    await $fetch(`/orders/cancel/${orderId}`, {
      method: "PATCH",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    orders.value = orders.value.map((o) =>
      o.id === orderId ? { ...o, status: "cancelled" } : o,
    );
    // Cập nhật popup chi tiết nếu đang mở đúng đơn này
    if (orderDetail.value?.id === orderId) {
      orderDetail.value = { ...orderDetail.value, status: "cancelled" };
    }
    alert("Đơn hàng đã được hủy");
  } catch (e) {
    console.error("Lỗi hủy đơn:", e);
    alert("Không thể hủy đơn hàng");
  }
};

const formatPrice = (v) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    Number(v) || 0,
  );

const orderTypeLabel = (order) =>
  order?.couponKind === "group" ? "Đơn nhóm" : "Đơn cá nhân";

// Thanh toán đơn awaiting_payment
const openPaymentModal = (order) => {
  if (!paymentModalRef.value) return;
  paymentModalRef.value.startPayment({
    orderId: order.id,
    amount: order.total,
    paymentMethod: order.paymentMethod,
  });
};

const paymentSuccessMessage = ref("");

const onPaymentSuccess = ({ orderId }) => {
  orders.value = orders.value.map((o) =>
    o.id === orderId ? { ...o, status: "pending", isPaid: true } : o,
  );
  if (orderDetail.value?.id === orderId) {
    orderDetail.value = {
      ...orderDetail.value,
      status: "pending",
      isPaid: true,
    };
  }
  // Hiển thị thông báo thành công
  paymentSuccessMessage.value =
    "Thanh toán thành công! Đơn hàng đã chuyển sang trạng thái chờ xử lý.";
  setTimeout(() => {
    paymentSuccessMessage.value = "";
  }, 6000);
};

// Đổi phương thức thanh toán từ online -> COD cho đơn lẻ
const changePaymentToCod = async (orderId) => {
  if (!confirm("Bạn có chắc muốn đổi sang thanh toán COD cho đơn này?")) {
    return;
  }
  try {
    const updated = await $fetch(`/orders/change-payment-method/${orderId}`, {
      method: "PATCH",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    // Cập nhật danh sách đơn
    orders.value = orders.value.map((o) =>
      o.id === updated.id
        ? {
            ...o,
            status: updated.status,
            paymentMethod: updated.paymentMethod,
            isPaid: updated.isPaid,
          }
        : o,
    );

    // Cập nhật popup chi tiết nếu đang mở đúng đơn
    if (orderDetail.value?.id === updated.id) {
      orderDetail.value = {
        ...orderDetail.value,
        status: updated.status,
        paymentMethod: updated.paymentMethod,
        isPaid: updated.isPaid,
      };
    }

    alert("Đã đổi phương thức thanh toán sang COD thành công.");
  } catch (e) {
    console.error("Lỗi đổi sang COD:", e);
    alert(
      e?.data?.error ||
        e?.data?.message ||
        "Không thể đổi sang COD, vui lòng thử lại.",
    );
  }
};

// hàm mở modal đánh giá
const openReviewModal = (item) => {
  if (!reviewModalRef.value) return;

  reviewModalRef.value.open({
    id: item.id, // orderItemId
    productId: item.productId,
    productName: item.productName,
    variantName: item.variantName,
    imageUrl: item.imageUrl,
  });
};

// Khi người dùng đánh giá xong, ẩn nút "Đánh giá" ngay lập tức
const onReviewSubmitted = ({ orderItemId }) => {
  if (!orderItemId) return;

  // Cập nhật cờ hasReview trong danh sách orders
  orders.value = orders.value.map((o) => ({
    ...o,
    items: o.items.map((it) =>
      it.id === orderItemId ? { ...it, hasReview: true } : it,
    ),
  }));

  // Nếu modal chi tiết đang mở và có trường hasReview trong items, cũng cập nhật
  if (orderDetail.value && Array.isArray(orderDetail.value.items)) {
    orderDetail.value = {
      ...orderDetail.value,
      items: orderDetail.value.items.map((it) =>
        it.id === orderItemId ? { ...it, hasReview: true } : it,
      ),
    };
  }
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

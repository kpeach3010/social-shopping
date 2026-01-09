<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[6px]"
    style="backdrop-filter: blur(6px)"
  >
    <div
      class="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-0 relative flex flex-col max-h-[90vh]"
    >
      <div
        class="flex items-center justify-between px-6 py-4 border-b bg-white rounded-t-xl shadow-sm"
      >
        <div class="text-xl font-bold text-gray-800 flex items-center gap-2">
          <span>Chi tiết đơn hàng</span>
          <span
            class="text-xs bg-white/20 rounded px-2 py-1 ml-2 tracking-wider"
          >
            #{{ order && order.id ? order.id : "" }}
          </span>
        </div>
        <button
          @click="$emit('close')"
          class="text-gray-400 text-2xl focus:outline-none focus:ring-2 z-20"
          style="position: relative"
        >
          &times;
        </button>
      </div>
      <div
        v-if="loading"
        class="flex flex-col items-center justify-center min-h-[300px] py-16"
      >
        <div
          class="animate-spin rounded-full h-10 w-10 border-b-2 border-black mb-4"
        ></div>
        <div class="text-lg text-gray-500 font-semibold">Đang tải...</div>
      </div>
      <div v-else-if="order" class="px-6 py-5 overflow-y-auto">
        <div
          class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4"
        >
          <div>
            <div class="text-gray-500 text-sm">Ngày tạo:</div>
            <div class="font-semibold">
              {{ new Date(order.createdAt).toLocaleString("vi-VN") }}
            </div>
          </div>
          <div>
            <div class="text-gray-500 text-sm mb-1">Thanh toán:</div>
            <div class="flex flex-col items-start gap-1">
              <div class="font-bold text-gray-800 uppercase text-sm">
                {{ order.paymentMethod }}
              </div>
              <span
                class="text-xs px-2 py-0.5 rounded border font-medium"
                :class="
                  order.isPaid
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-orange-50 border-orange-200 text-orange-700'
                "
              >
                <span v-if="order.isPaid">● Đã thanh toán</span>
                <span v-else>○ Chưa thanh toán</span>
              </span>
            </div>
          </div>
          <div>
            <div class="text-gray-500 text-sm">Trạng thái:</div>
            <div
              :class="statusColorClass(order.status)"
              class="font-semibold inline-block px-3 py-1 rounded-full"
            >
              {{ statusText(order.status) }}
            </div>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div>
            <div class="font-semibold mb-1 text-gray-700">
              Thông tin giao hàng
            </div>
            <div class="text-sm text-gray-600">
              <div v-if="order.shippingName">Tên: {{ order.shippingName }}</div>
              <div v-if="order.shippingPhone">
                SĐT: {{ order.shippingPhone }}
              </div>
              <div
                v-if="
                  order.addressDetail ||
                  order.ward ||
                  order.district ||
                  order.province
                "
              >
                Địa chỉ: {{ order.addressDetail }}, {{ order.ward }},
                {{ order.district }}, {{ order.province }}
              </div>
            </div>
          </div>
          <div>
            <div class="font-semibold mb-1 text-gray-700">Người mua</div>
            <div class="text-sm text-gray-600">
              <div v-if="order.buyer">
                {{ order.buyer.name }}<br />
                <span v-if="order.buyer.phone"
                  >SĐT: {{ order.buyer.phone }}</span
                ><br />
                <span v-if="order.buyer.address"
                  >Địa chỉ: {{ order.buyer.address }}</span
                >
              </div>
              <div v-else>-</div>
            </div>
          </div>
        </div>
        <div class="mb-4">
          <span class="font-semibold text-gray-700">Mã giảm giá: </span>
          <span v-if="order.couponCode">
            {{ order.couponCode }}
            <span v-if="order.coupon && order.coupon.discount">
              - Giảm {{ order.coupon.discount
              }}{{ order.coupon.type === "percent" ? "%" : "₫" }}
            </span>
          </span>
          <span v-else>-</span>
        </div>
        <div class="mb-2 font-semibold text-gray-700">Danh sách sản phẩm</div>
        <div class="overflow-x-auto rounded-lg border">
          <table class="min-w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-3 py-2 font-semibold text-left">Ảnh</th>
                <th class="px-3 py-2 font-semibold text-left">Tên sản phẩm</th>
                <th class="px-3 py-2 font-semibold text-left">Phân loại</th>
                <th class="px-3 py-2 font-semibold text-center">Số lượng</th>
                <th class="px-3 py-2 font-semibold text-right">Đơn giá</th>
                <th class="px-3 py-2 font-semibold text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in order.items"
                :key="item.id"
                class="border-b hover:bg-gray-50"
              >
                <td class="px-3 py-2">
                  <img
                    :src="item.imageUrl"
                    alt="img"
                    class="w-14 h-14 object-cover rounded border"
                  />
                </td>
                <td class="px-3 py-2 font-medium">{{ item.productName }}</td>
                <td class="px-3 py-2">{{ item.variantName }}</td>
                <td class="px-3 py-2 text-center">x{{ item.quantity }}</td>
                <td class="px-3 py-2 text-right">
                  {{ formatPrice(item.price) }}
                </td>
                <td class="px-3 py-2 text-right">
                  {{ formatPrice(item.price * item.quantity) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex flex-col items-end gap-2 mt-6 border-t pt-4">
          <div class="flex justify-between w-full md:w-1/2 text-sm">
            <span class="text-gray-600">Tổng tiền hàng:</span>
            <span class="font-medium text-gray-900">{{
              formatPrice(order.subtotal)
            }}</span>
          </div>

          <div class="flex justify-between w-full md:w-1/2 text-sm">
            <span class="text-gray-600">Phí vận chuyển:</span>
            <span class="font-medium text-gray-900">{{
              formatPrice(order.shippingFee)
            }}</span>
          </div>

          <div
            v-if="Number(order.discountTotal) > 0"
            class="flex justify-between w-full md:w-1/2 text-sm"
          >
            <span class="text-gray-600">Voucher giảm giá:</span>
            <span class="font-medium text-red-600"
              >- {{ formatPrice(order.discountTotal) }}</span
            >
          </div>

          <div
            class="flex justify-between w-full md:w-1/2 mt-2 pt-2 border-t items-center"
          >
            <span class="font-bold text-gray-800 text-base"
              >Tổng thanh toán:</span
            >
            <span class="text-xl font-bold text-green-700">{{
              formatPrice(order.total)
            }}</span>
          </div>
        </div>
      </div>
      <div v-else class="p-6 text-center text-gray-500">
        Không tìm thấy đơn hàng
      </div>
    </div>
  </div>
</template>

<script setup>
const config = useRuntimeConfig();
// Trạng thái tiếng Việt và màu sắc
function statusText(status) {
  switch (status) {
    case "pending":
      return "Chờ xác nhận";
    case "confirmed":
      return "Đã xác nhận";
    case "completed":
      return "Hoàn thành";
    case "cancelled":
      return "Đã hủy";
    case "rejected":
      return "Từ chối";
    default:
      return status;
  }
}
function statusColorClass(status) {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "confirmed":
      return "bg-blue-100 text-blue-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-gray-200 text-gray-600 line-through";
    case "rejected":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}
import { ref, watch, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";
const props = defineProps({
  show: Boolean,
  orderId: String,
});
const emit = defineEmits(["close"]);
const order = ref(null);
const loading = ref(false);
const auth = useAuthStore();

function formatPrice(v) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(v) || 0);
}

async function fetchOrderDetail() {
  if (!props.orderId) return;
  loading.value = true;
  try {
    order.value = await $fetch(`orders/${props.orderId}`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      baseURL: config.public.apiBase,
    });
  } catch (err) {
    order.value = null;
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.show,
  (val) => {
    if (val) {
      order.value = null;
      loading.value = true;
      fetchOrderDetail();
    }
  }
);
watch(
  () => props.orderId,
  (val) => {
    if (props.show && val) fetchOrderDetail();
  }
);
</script>

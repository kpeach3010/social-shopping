<template>
  <div v-if="show" class="fixed inset-0 flex items-center justify-center z-50 p-4">
    <!-- Overlay mờ nền -->
    <div
      class="absolute inset-0 bg-black/40 backdrop-blur-sm"
      @click="$emit('close')"
    ></div>

    <!-- Khung popup -->
    <div
      class="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden z-10 border flex flex-col"
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50">
        <div>
          <h2 class="text-lg font-bold text-gray-900">Chi tiết đơn hàng</h2>
          <p class="text-xs text-gray-500 font-mono mt-0.5">Mã đơn: {{ order?.id }}</p>
        </div>
        <button
          class="text-gray-400 hover:text-gray-900 text-xl p-1"
          @click="$emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- Nội dung scroll -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar min-h-[300px]">
        <!-- Loading state -->
        <div v-if="loading" class="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3">
          <i class="bx bx-loader-alt animate-spin text-4xl text-gray-400"></i>
          <p class="text-sm font-medium text-gray-500">Đang tải chi tiết...</p>
        </div>

        <div v-if="order && !loading" class="space-y-6">
          
          <!-- Trạng thái & Ngày đặt -->
          <div class="flex flex-wrap gap-x-8 gap-y-3 pb-4 border-b text-sm">
            <div>
              <span class="text-gray-500 block mb-1">Trạng thái</span>
              <div class="flex items-center gap-2">
                <span :class="['w-2 h-2 rounded-full', statusColor(order.status)]"></span>
                <span class="font-semibold text-gray-900">{{ statusText(order.status) }}</span>
              </div>
            </div>
            <div v-if="order.paymentMethod !== 'COD'">
              <span class="text-gray-500 block mb-1">Thanh toán</span>
              <span class="font-semibold text-gray-900">
                {{ order.status === 'cancelled' && !order.isPaid ? 'Quá hạn thanh toán' : (order.isPaid ? 'Đã thanh toán' : 'Chờ thanh toán') }}
              </span>
            </div>
            <div>
              <span class="text-gray-500 block mb-1">Ngày đặt hàng</span>
              <span class="font-semibold text-gray-900">
                {{ new Date(order.createdAt).toLocaleString("vi-VN") }}
              </span>
            </div>
          </div>

          <!-- Thông tin nhận hàng & Thanh toán -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div class="space-y-3">
              <h3 class="font-bold text-gray-900 uppercase tracking-tight text-xs">Thông tin nhận hàng</h3>
              <div class="space-y-1">
                <p><span class="text-gray-500">Người nhận:</span> <span class="font-medium">{{ order.shippingName }}</span></p>
                <p><span class="text-gray-500">Điện thoại:</span> <span class="font-medium">{{ order.shippingPhone }}</span></p>
                <p class="leading-relaxed">
                  <span class="text-gray-500">Địa chỉ: </span> 
                  <span class="font-medium">{{ order.addressDetail }}, {{ order.ward }}, {{ order.district }}, {{ order.province }}</span>
                </p>
              </div>
            </div>

            <div class="space-y-3">
              <h3 class="font-bold text-gray-900 uppercase tracking-tight text-xs">Thông tin thanh toán</h3>
              <div class="space-y-1">
                <p><span class="text-gray-500">Phương thức:</span> <span class="font-medium">{{ order.paymentMethod }}</span></p>
                <p v-if="order.couponCode"><span class="text-gray-500">Mã giảm giá:</span> <span class="font-medium text-green-600">{{ order.couponCode }}</span></p>
                <p v-if="order.groupName">
                  <span class="text-gray-500">Nhóm mua: </span> 
                  <span class="font-bold text-blue-600">{{ order.groupName }}</span>
                </p>
                <p v-if="order.status === 'confirmed'">
                  <span class="text-gray-500">Giao hàng:</span> 
                  <span class="font-medium italic text-gray-400">Dự kiến 3-5 ngày</span>
                </p>
              </div>
            </div>
          </div>

          <!-- Danh sách sản phẩm -->
          <div class="space-y-3">
            <h3 class="font-bold text-gray-900 uppercase tracking-tight text-xs">Sản phẩm ({{ order.items?.length }})</h3>
            <div class="border rounded-xl divide-y overflow-hidden">
              <div
                v-for="item in order.items"
                :key="item.id"
                class="flex items-center gap-4 p-3 hover:bg-gray-50 cursor-pointer transition"
                @click="$emit('navigate-to-product', item.productId)"
              >
                <img
                  :src="item.imageUrl"
                  class="w-12 h-12 object-cover rounded-lg border flex-shrink-0"
                  alt="Sản phẩm"
                />
                <div class="flex-1 min-w-0 text-sm">
                  <p class="font-semibold text-gray-900 truncate">{{ item.productName }}</p>
                  <p class="text-xs text-gray-500">{{ item.variantName }} × {{ item.quantity }}</p>
                </div>
                <p class="font-bold text-gray-900 text-sm italic">{{ formatPrice(item.price) }}</p>
              </div>
            </div>
          </div>

          <!-- Tổng kết tiền -->
          <div class="bg-gray-50 rounded-xl p-4 space-y-2 text-sm ml-auto w-full md:w-64 border">
            <div class="flex justify-between text-gray-500">
              <span>Tạm tính</span>
              <span>{{ formatPrice(order.subtotal) }}</span>
            </div>
            <div class="flex justify-between text-gray-500">
              <span>Phí vận chuyển</span>
              <span>{{ formatPrice(order.shippingFee) }}</span>
            </div>
            <div v-if="order.discountTotal > 0" class="flex justify-between text-green-600">
              <span>Giảm giá</span>
              <span>-{{ formatPrice(order.discountTotal) }}</span>
            </div>
            <div class="pt-2 border-t flex justify-between items-baseline font-bold text-gray-900">
              <span>Tổng cộng</span>
              <span class="text-lg">{{ formatPrice(order.total) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t flex justify-end gap-3 bg-gray-50/50">
        <button
          v-if="order?.status === 'awaiting_payment' && order?.couponKind !== 'group'"
          class="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
          :disabled="changingCodOrderId || cancellingOrderId"
          @click="$emit('pay', order)"
        >
          Thanh toán
        </button>
        
        <button
          v-if="
            order?.status === 'awaiting_payment' &&
            order?.paymentMethod !== 'COD' &&
            order?.couponKind !== 'group'
          "
          class="px-4 py-2 bg-white border border-black text-black rounded-lg hover:bg-gray-50 transition disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
          :disabled="changingCodOrderId === order.id"
          @click="$emit('change-to-cod', order.id)"
        >
          <i v-if="changingCodOrderId === order.id" class="bx bx-loader-alt animate-spin text-lg"></i>
          {{ changingCodOrderId === order.id ? "Đang xử lý..." : "Đổi sang COD" }}
        </button>
        
        <button
          v-if="
            (order?.status === 'pending' || order?.status === 'awaiting_payment') &&
            order?.couponKind !== 'group'
          "
          class="px-4 py-2 bg-white border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
          :disabled="cancellingOrderId === order.id"
          @click="$emit('cancel', order.id)"
        >
          <i v-if="cancellingOrderId === order.id" class="bx bx-loader-alt animate-spin text-lg"></i>
          {{ cancellingOrderId === order.id ? "Đang hủy..." : "Hủy đơn hàng" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  show: Boolean,
  loading: Boolean,
  order: Object,
  cancellingOrderId: String,
  changingCodOrderId: String,
});

defineEmits(["close", "pay", "change-to-cod", "cancel", "navigate-to-product"]);

const formatPrice = (v) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    Number(v) || 0,
  );

const statusText = (status) => {
  const map = {
    awaiting_payment: "Chờ thanh toán",
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    rejected: "Bị từ chối",
    completed: "Hoàn thành",
    cancelled: "Đã hủy",
  };
  return map[status] || status;
};

const statusColor = (status) => {
  const map = {
    awaiting_payment: "bg-orange-400",
    pending: "bg-yellow-400",
    confirmed: "bg-blue-500",
    rejected: "bg-red-500",
    completed: "bg-green-500",
    cancelled: "bg-gray-400",
  };
  return map[status] || "bg-gray-400";
};
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #d1d5db;
}
</style>

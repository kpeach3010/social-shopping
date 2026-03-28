<template>
  <div v-if="show" class="fixed inset-0 flex items-center justify-center z-50 p-4">
    <!-- Overlay mờ nền -->
    <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="$emit('close')"></div>

    <!-- Khung popup -->
    <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden z-10 border flex flex-col">
      <!-- Header Nhỏ gọn (py-3) -->
      <div class="px-6 py-3 border-b flex justify-between items-center bg-gray-50/50 sticky top-0 z-10">
        <div>
          <h2 class="text-lg font-bold text-gray-900 leading-tight">Chi tiết đơn hàng</h2>
          <p class="text-xs text-gray-500 font-mono mt-0.5">Mã đơn: {{ orderId }}</p>
        </div>
        <button 
          @click="$emit('close')" 
          class="text-gray-400 hover:text-gray-900 text-xl p-1 transition-colors"
          title="Đóng"
        >
          ✕
        </button>
      </div>

      <!-- Nội dung -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        <div v-if="loading" class="py-20 flex flex-col items-center justify-center space-y-3">
          <i class="bx bx-loader-alt animate-spin text-3xl text-gray-300"></i>
          <p class="text-sm text-gray-400">Đang tải...</p>
        </div>

        <div v-if="order && !loading" class="space-y-6">
          <!-- Tóm tắt trạng thái (Gọn gàng hơn với Grid) -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-2 pb-5 border-b text-sm">
            <div class="space-y-1">
              <span class="text-gray-400 block text-[10px] uppercase tracking-wider font-bold">Trạng thái</span>
              <div class="flex items-center gap-2">
                <span :class="['w-1.5 h-1.5 rounded-full', statusColor(order.status)]"></span>
                <span class="font-bold text-gray-900">{{ statusText(order.status) }}</span>
              </div>
            </div>
            <div class="space-y-1">
              <span class="text-gray-400 block text-[10px] uppercase tracking-wider font-bold">Thanh toán</span>
              <span class="font-bold text-gray-900 truncate block">
                {{ order.paymentMethod }}
                <span v-if="order.paymentMethod !== 'COD'" class="text-gray-400 font-normal text-xs ml-0.5">
                  ({{ order.isPaid ? 'Đã trả' : 'Chưa trả' }})
                </span>
              </span>
            </div>
            <div class="space-y-1">
              <span class="text-gray-400 block text-[10px] uppercase tracking-wider font-bold">Loại đơn</span>
              <div v-if="order.groupOrderId" class="leading-tight">
                <span class="font-bold text-gray-900 block text-xs">Mua chung</span>
                <p class="font-medium text-gray-900 text-xs truncate max-w-[120px]" :title="order.groupName">{{ order.groupName || 'Chung' }}</p>
              </div>
              <span class="font-bold text-gray-600 block" v-else>Cá nhân</span>
            </div>
            <div class="space-y-1">
              <span class="text-gray-400 block text-[10px] uppercase tracking-wider font-bold">Ngày đặt hàng</span>
              <span class="font-bold text-gray-900 block text-xs whitespace-nowrap">{{ new Date(order.createdAt).toLocaleString("vi-VN") }}</span>
            </div>
          </div>

          <!-- Thông tin Địa chỉ (Đồng bộ font-size/weight với customer) -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div class="space-y-3">
              <h3 class="font-bold text-gray-900 uppercase tracking-tight text-xs">Thông tin người đặt</h3>
              <div class="space-y-1">
                <p><span class="text-gray-500">Người đặt:</span> <span class="font-medium text-gray-900">{{ order.buyer?.fullName || order.buyer?.name || 'Khách vãng lai' }}</span></p>
                <p><span class="text-gray-500">Điện thoại:</span> <span class="font-medium text-gray-900">{{ order.buyer?.phone || '-' }}</span></p>
                <div class="leading-relaxed">
                  <span class="text-gray-500">Địa chỉ: </span> 
                  <span class="font-medium text-gray-900">
                    <template v-if="order.buyer?.addressDetail">
                      {{ order.buyer.addressDetail }}, {{ order.buyer.ward }}, {{ order.buyer.district }}, {{ order.buyer.province }}
                    </template>
                    <template v-else>
                      {{ order.buyer?.address || 'N/A' }}
                    </template>
                  </span>
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <h3 class="font-bold text-gray-900 uppercase tracking-tight text-xs">Thông tin nhận hàng</h3>
              <div class="space-y-1">
                <p><span class="text-gray-500">Người nhận:</span> <span class="font-medium text-gray-900">{{ order.shippingName }}</span></p>
                <p><span class="text-gray-500">Điện thoại:</span> <span class="font-medium text-gray-900">{{ order.shippingPhone }}</span></p>
                <div class="leading-relaxed">
                  <span class="text-gray-500">Địa chỉ: </span>
                  <span class="font-medium text-gray-900">
                    {{ order.addressDetail }}, {{ order.ward }}, {{ order.district }}, {{ order.province }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Sản phẩm -->
          <div class="space-y-3">
            <h3 class="font-bold text-gray-900 uppercase tracking-tight text-xs">Sản phẩm ({{ order.items?.length || 0 }})</h3>
            <div class="border rounded-xl divide-y overflow-y-auto max-h-[280px] custom-scrollbar shadow-inner bg-white">
              <div v-for="item in order.items" :key="item.id" class="flex items-center gap-4 p-3 hover:bg-gray-50 cursor-pointer transition">
                <img :src="item.imageUrl" class="w-12 h-12 object-cover rounded-lg border flex-shrink-0" />
                <div class="flex-1 min-w-0 text-sm">
                  <p class="font-semibold text-gray-900 truncate">{{ item.productName }}</p>
                  <p class="text-xs text-gray-500">{{ item.variantName }} × {{ item.quantity }}</p>
                </div>
                <p class="font-bold text-gray-900 text-sm italic">{{ formatPrice(item.price) }}</p>
              </div>
            </div>
          </div>

          <!-- Tổng kết tiền -->
          <div class="flex justify-end pt-2">
            <div class="bg-gray-50 rounded-xl p-4 space-y-2 text-sm w-full md:w-64 border shadow-sm">
              <div class="flex justify-between text-gray-500">
                <span>Tổng số lượng</span>
                <span class="font-medium text-gray-600">{{ totalQuantity }} sản phẩm</span>
              </div>
              <div class="flex justify-between text-gray-500">
                <span>Tạm tính</span>
                <span>{{ formatPrice(order.subtotal) }}</span>
              </div>
              <div class="flex justify-between text-gray-500">
                <span>Phí vận chuyển</span>
                <span>{{ formatPrice(order.shippingFee) }}</span>
              </div>
              <div v-if="order.discountTotal > 0" class="flex justify-between text-green-600 font-medium">
                <div class="flex flex-col">
                  <span>Giảm giá ({{ order.couponCode }})</span>
                  <span class="text-[10px] text-gray-400 font-normal">{{ order.couponDescription }}</span>
                </div>
                <span>-{{ formatPrice(order.discountTotal) }}</span>
              </div>
              <div class="pt-2 border-t flex justify-between items-baseline font-bold text-gray-900">
                <span>Tổng cộng</span>
                <span class="text-lg">{{ formatPrice(order.total) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer (Hành động Duyệt/Từ chối - Không có nút Đóng) -->
      <div v-if="order && !loading && order.status === 'pending'" class="px-6 py-4 border-t flex justify-end gap-3 bg-gray-50/50">
        <button @click="$emit('reject', order)" class="px-4 py-2 bg-white border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition text-sm font-medium">
          Từ chối
        </button>
        <button @click="$emit('approve', order)" class="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition text-sm font-bold">
          Xác nhận đơn
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from "vue";
import { useAuthStore } from "@/stores/auth";

const props = defineProps({
  show: Boolean,
  orderId: String,
});

const emit = defineEmits(["close", "approve", "reject"]);

const order = ref(null);
const loading = ref(false);
const auth = useAuthStore();
const config = useRuntimeConfig();

// Tính tổng số lượng sản phẩm
const totalQuantity = computed(() => {
  return order.value?.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
});

const statusText = (status) => {
  const map = { awaiting_payment: "Chờ thanh toán", pending: "Chờ xác nhận", confirmed: "Đã xác nhận", rejected: "Bị từ chối", completed: "Hoàn thành", cancelled: "Đã hủy" };
  return map[status] || status;
};

const statusColor = (status) => {
  const map = { awaiting_payment: "bg-orange-400", pending: "bg-yellow-400", confirmed: "bg-blue-500", rejected: "bg-red-500", completed: "bg-green-500", cancelled: "bg-gray-400" };
  return map[status] || "bg-gray-400";
};

function formatPrice(v) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(v) || 0);
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

watch(() => props.show, (val) => { if (val) { order.value = null; fetchOrderDetail(); } });
watch(() => props.orderId, (val) => { if (props.show && val) fetchOrderDetail(); });
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

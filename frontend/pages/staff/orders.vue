<script setup>
import { ref, computed, onMounted } from "vue";
import Sidebar from "@/components/modals/staff/Sidebar.vue";

import { Check, X } from "lucide-vue-next";
import Pagination from "@/components/Pagination.vue";
import OrderDetailModal from "@/components/modals/staff/OrderDetailModal.vue";

const currentPage = ref(1);
const perPage = 8;

const isOpen = ref(true);
const toggleSidebar = () => {
  isOpen.value = !isOpen.value;
};
const orders = ref([]);
const loading = ref(false);
const selectedStatus = ref("all");
const showDetailModal = ref(false);
const detailOrderId = ref(null);
const auth = useAuthStore();
const config = useRuntimeConfig();

const statusOptions = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Đang chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "rejected", label: "Bị từ chối" },
  { value: "completed", label: "Đã hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
];

const statusLabel = (status) => {
  switch (status) {
    case "pending":
      return "Đang chờ xác nhận";
    case "confirmed":
      return "Đã xác nhận";
    case "rejected":
      return "Bị từ chối";
    case "completed":
      return "Đã hoàn thành";
    case "cancelled":
      return "Đã hủy";
    default:
      return status;
  }
};

const formatPrice = (v) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(v) || 0);
};

const fetchOrders = async () => {
  loading.value = true;
  try {
    orders.value = await $fetch("/orders/overview", {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
  } catch (err) {
    alert("Lỗi tải đơn hàng!");
    console.error(err);
  } finally {
    loading.value = false;
  }
};

onMounted(fetchOrders);

const filteredOrders = computed(() => {
  if (selectedStatus.value === "all") return orders.value;
  return orders.value.filter((o) => o.status === selectedStatus.value);
});

const totalPages = computed(() =>
  Math.ceil(filteredOrders.value.length / perPage)
);
const paginatedOrders = computed(() => {
  const start = (currentPage.value - 1) * perPage;
  return filteredOrders.value.slice(start, start + perPage);
});

const approveOrder = async (id) => {
  if (!confirm("Xác nhận đơn hàng này?")) return;
  try {
    await $fetch(`/orders/approve/${id}`, {
      method: "PATCH",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    await fetchOrders();
    alert("Đã xác nhận đơn hàng!");
  } catch (err) {
    alert("Lỗi xác nhận đơn hàng!");
    console.error(err);
  }
};

const rejectOrder = async (id) => {
  if (!confirm("Từ chối đơn hàng này?")) return;
  try {
    await $fetch(`/orders/reject/${id}`, {
      method: "PATCH",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    await fetchOrders();
    alert("Đã từ chối đơn hàng!");
  } catch (err) {
    alert("Lỗi từ chối đơn hàng!");
    console.error(err);
  }
};

const openDetail = (order) => {
  detailOrderId.value = order.id;
  showDetailModal.value = true;
};
</script>

<template>
  <div class="flex min-h-screen bg-gray-50">
    <Sidebar :isOpen="isOpen" @toggle="toggleSidebar" />
    <div class="flex-1 flex flex-col">
      <main class="flex-1 p-6">
        <h1 class="text-2xl font-bold mb-4">Quản lý đơn hàng</h1>

        <!-- Tabs -->
        <div class="mb-4">
          <div class="flex gap-2 border-b">
            <button
              v-for="s in statusOptions"
              :key="s.value"
              @click="selectedStatus = s.value"
              class="px-4 py-2 text-base font-medium transition border-b-2"
              :class="[
                selectedStatus === s.value
                  ? 'border-black text-black font-semibold'
                  : 'border-transparent text-gray-500 hover:text-black',
              ]"
              style="background: none; border-radius: 0; outline: none"
            >
              {{ s.label }}
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="text-center py-6 text-gray-500">
          Đang tải...
        </div>

        <!-- Table -->
        <div
          v-else
          class="overflow-x-auto bg-white rounded-lg shadow transition"
        >
          <table
            class="min-w-full text-sm text-left text-gray-600 border-collapse"
          >
            <thead class="bg-gray-300 text-gray-800 font-semibold">
              <tr>
                <th class="px-2 py-3 w-20">Ảnh</th>
                <th class="px-4 py-3">Mã đơn</th>
                <th class="px-4 py-3">Ngày tạo</th>
                <th class="px-4 py-3">Tổng tiền</th>
                <th class="px-4 py-3">Trạng thái</th>
                <th class="px-4 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="o in paginatedOrders"
                :key="o.id"
                class="border-b hover:bg-gray-200 transition-colors cursor-pointer odd:bg-gray-100 even:bg-white"
                @click="openDetail(o)"
              >
                <!-- Ảnh -->
                <td class="px-2 py-3">
                  <div class="flex items-center gap-1">
                    <template v-if="o.items && o.items.length">
                      <template
                        v-for="(item, idx) in o.items.slice(0, 2)"
                        :key="idx"
                      >
                        <img
                          :src="item.imageUrl"
                          class="w-8 h-8 object-cover rounded border"
                          :alt="item.productName"
                        />
                      </template>

                      <span
                        v-if="o.items.length > 2"
                        class="ml-1 text-xs bg-gray-200 text-gray-700 rounded-full px-2 py-0.5 font-semibold"
                      >
                        +{{ o.items.length - 2 }}
                      </span>
                    </template>
                  </div>
                </td>

                <!-- Mã đơn -->
                <td class="px-4 py-3 font-mono">{{ o.id }}</td>

                <!-- Ngày tạo -->
                <td class="px-4 py-3">
                  {{ new Date(o.createdAt).toLocaleString("vi-VN") }}
                </td>

                <!-- Tổng tiền -->
                <td class="px-4 py-3 font-semibold text-gray-800">
                  {{ formatPrice(o.total) }}
                </td>

                <!-- Trạng thái -->
                <td class="px-4 py-3">
                  <span
                    :class="{
                      'bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full':
                        o.status === 'pending',
                      'bg-blue-100 text-blue-700 px-2 py-1 rounded-full':
                        o.status === 'confirmed',
                      'bg-red-100 text-red-700 px-2 py-1 rounded-full':
                        o.status === 'rejected',
                      'bg-green-100 text-green-700 px-2 py-1 rounded-full':
                        o.status === 'completed',
                      'bg-gray-100 text-gray-700 px-2 py-1 rounded-full':
                        o.status === 'cancelled',
                    }"
                  >
                    {{ statusLabel(o.status) }}
                  </span>
                </td>

                <!-- Hành động -->
                <td class="px-4 py-3 text-right">
                  <div class="flex justify-end gap-2">
                    <button
                      v-if="o.status === 'pending'"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-green-600 bg-green-600 text-white text-base font-medium hover:bg-green-700 active:bg-green-800 transition"
                      @click.stop="approveOrder(o.id)"
                    >
                      <Check class="w-4 h-4" />
                      <span class="text-sm font-medium">Xác nhận</span>
                    </button>
                    <button
                      v-if="o.status === 'pending'"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-600 bg-red-600 text-white text-base font-medium hover:bg-red-700 active:bg-red-800 transition"
                      @click.stop="rejectOrder(o.id)"
                    >
                      <X class="w-4 h-4" />
                      <span class="text-sm font-medium">Từ chối</span>
                    </button>
                    <span v-else class="text-sm text-gray-500 italic">-</span>
                  </div>
                </td>
              </tr>

              <!-- Nếu không có đơn -->
              <tr v-if="paginatedOrders.length === 0">
                <td colspan="6" class="text-center py-6 text-gray-400">
                  Không có đơn hàng
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Pagination -->
          <Pagination
            v-if="totalPages > 1"
            :totalPages="totalPages"
            :currentPage="currentPage"
            :perPage="perPage"
            :total="filteredOrders.length"
            @update:currentPage="
              (p) => {
                if (p >= 1 && p <= totalPages) currentPage = p;
              }
            "
          />
        </div>

        <OrderDetailModal
          :show="showDetailModal"
          :orderId="detailOrderId"
          @close="showDetailModal = false"
        />
      </main>
    </div>
  </div>
</template>

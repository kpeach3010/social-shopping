<script setup>
import { ref, computed, onMounted, watch } from "vue";
import Sidebar from "@/components/modals/staff/Sidebar.vue";

import { Check, X as CloseIcon, Loader2, Search, RotateCw } from "lucide-vue-next";
import Pagination from "@/components/Pagination.vue";
import OrderDetailModal from "@/components/modals/staff/OrderDetailModal.vue";

const currentPage = ref(1);
const perPage = 8;
const searchKeyword = ref("");

const isOpen = ref(true);
const toggleSidebar = () => {
  isOpen.value = !isOpen.value;
};
const orders = ref([]);
const loading = ref(false);
const processingOrderId = ref(null);
const processingGroupId = ref(null);
const selectedStatus = ref("all");
const showDetailModal = ref(false);
const detailOrderId = ref(null);
const auth = useAuthStore();
const config = useRuntimeConfig();

const statusOptions = [
  { value: "all", label: "Tất cả" },
  { value: "awaiting_payment", label: "Chờ thanh toán" },
  { value: "pending", label: "Đang chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "rejected", label: "Bị từ chối" },
  { value: "completed", label: "Đã hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
];

const statusLabel = (status) => {
  switch (status) {
    case "awaiting_payment":
      return "Chờ thanh toán";
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

onMounted(() => {
  fetchOrders();
  if (window.innerWidth < 1024) {
    isOpen.value = false;
  }
});

const filteredOrders = computed(() => {
  let result = orders.value;

  // Lọc theo trạng thái
  if (selectedStatus.value !== "all") {
    result = result.filter((o) => o.status === selectedStatus.value);
  }

  // Lọc theo từ khóa tìm kiếm (Mã đơn hoặc Tên khách hàng)
  if (searchKeyword.value.trim()) {
    const q = searchKeyword.value.toLowerCase();
    result = result.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        (o.groupOrder?.customer?.fullName || "").toLowerCase().includes(q),
    );
  }

  return result;
});

// Reset trang khi thay đổi từ khóa hoặc trạng thái
watch([searchKeyword, selectedStatus], () => {
  currentPage.value = 1;
});

const totalPages = computed(() =>
  Math.ceil(filteredOrders.value.length / perPage),
);
const paginatedOrders = computed(() => {
  const start = (currentPage.value - 1) * perPage;
  return filteredOrders.value.slice(start, start + perPage);
});

// Xác định order đầu tiên của mỗi nhóm để chỉ hiển thị 1 nút hành động
const groupFirstOrderIds = computed(() => {
  const firstIds = new Set();
  const seenGroups = new Set();

  for (const o of paginatedOrders.value) {
    if (!o.groupOrderId) continue;
    if (!seenGroups.has(o.groupOrderId)) {
      seenGroups.add(o.groupOrderId);
      firstIds.add(o.id);
    }
  }

  return firstIds;
});

// Gán màu (border + nền) khác nhau cho từng groupOrderId trong trang hiện tại
const groupColorMap = computed(() => {
  const colors = [
    // Các màu trung tính, ít sặc sỡ nhưng vẫn giúp phân biệt từng nhóm
    "border-l-4 border-gray-400 bg-gray-50",
    "border-l-4 border-gray-500 bg-gray-50",
    "border-l-4 border-gray-300 bg-gray-50",
  ];

  const map = new Map();
  let idx = 0;

  for (const o of paginatedOrders.value) {
    if (!o.groupOrderId) continue;
    if (!map.has(o.groupOrderId)) {
      map.set(o.groupOrderId, colors[idx % colors.length]);
      idx++;
    }
  }

  return map;
});

const approveOrder = async (id) => {
  if (!confirm("Xác nhận đơn hàng này?")) return;
  processingOrderId.value = id;
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
  } finally {
    processingOrderId.value = null;
  }
};

// Xác nhận tất cả đơn trong một nhóm
const approveGroup = async (groupOrderId) => {
  if (!confirm("Xác nhận tất cả đơn trong nhóm này?")) return;
  processingGroupId.value = groupOrderId;
  try {
    await $fetch(`/orders/approve-group/${groupOrderId}`, {
      method: "PATCH",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    await fetchOrders();
    alert("Đã xác nhận toàn bộ đơn trong nhóm!");
  } catch (err) {
    alert("Lỗi xác nhận đơn nhóm!");
    console.error(err);
  } finally {
    processingGroupId.value = null;
  }
};

const rejectOrder = async (id) => {
  if (!confirm("Từ chối đơn hàng này?")) return;
  processingOrderId.value = id;
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
  } finally {
    processingOrderId.value = null;
  }
};

// Từ chối cả nhóm: dùng 1 order bất kỳ trong nhóm (service đã xử lý cả nhóm)
const rejectGroup = async (orderId, groupOrderId) => {
  if (!confirm("Từ chối toàn bộ đơn trong nhóm này?")) return;
  processingGroupId.value = groupOrderId;
  try {
    await $fetch(`/orders/reject/${orderId}`, {
      method: "PATCH",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    await fetchOrders();
    alert("Đã từ chối toàn bộ đơn trong nhóm!");
  } catch (err) {
    alert("Lỗi từ chối đơn nhóm!");
    console.error(err);
  } finally {
    processingGroupId.value = null;
  }
};

const openDetail = (order) => {
  detailOrderId.value = order.id;
  showDetailModal.value = true;
};

const resetSearch = () => {
  searchKeyword.value = "";
};
</script>

<template>
  <div class="flex min-h-screen bg-gray-50">
    <Sidebar :isOpen="isOpen" @toggle="toggleSidebar" />
    <div class="flex-1 flex flex-col min-w-0">
      <main class="flex-1 p-4 md:p-6 overflow-hidden">
        <div class="flex items-center gap-3 mb-4">
          <button
            @click="toggleSidebar"
            class="lg:hidden p-2 -ml-2 rounded-md hover:bg-gray-200 text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div class="flex items-center gap-2">
            <h1 class="text-xl md:text-2xl font-bold">Quản lý đơn hàng</h1>
            <button
              @click="fetchOrders"
              class="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm flex items-center gap-2 group ml-2"
              :disabled="loading"
              title="Tải lại danh sách"
            >
              <RotateCw 
                class="w-4 h-4 text-gray-500 group-hover:text-black transition-colors" 
                :class="{ 'animate-spin': loading }"
              />
            </button>
          </div>
        </div>

        <!-- Search bar -->
        <div class="mb-4 relative max-w-md group">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search class="h-5 w-5 text-gray-400 group-focus-within:text-black transition-colors" />
          </div>
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="Tìm kiếm bằng mã đơn hàng..."
            class="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-black transition-all text-sm"
          />
          <button
            v-if="searchKeyword"
            @click="resetSearch"
            class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-red-500 transition-colors"
            title="Xóa tìm kiếm"
          >
            <CloseIcon class="h-5 w-5" />
          </button>
        </div>
        <!-- Tabs -->
        <div class="mb-4 overflow-x-auto scrollbar-hide">
          <div class="flex gap-2 border-b whitespace-nowrap min-w-max">
            <button
              v-for="s in statusOptions"
              :key="s.value"
              @click="selectedStatus = s.value"
              class="px-4 py-2 text-sm md:text-base font-medium transition border-b-2"
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
        <div v-if="loading && orders.length === 0" class="text-center py-6 text-gray-500">
          Đang tải...
        </div>

        <!-- Table -->
        <div
          v-else
          class="overflow-x-auto bg-white rounded-lg shadow transition"
        >
          <table
            class="w-max min-w-full text-sm text-left text-gray-600 border-collapse"
          >
            <thead class="bg-gray-300 text-gray-800 font-semibold">
              <tr>
                <th class="px-2 py-3 w-40 min-w-[150px]">Ảnh</th>
                <th class="px-4 py-3 min-w-[180px]">Mã đơn</th>
                <th class="px-4 py-3">Tên nhóm</th>
                <th class="px-4 py-3">Ngày tạo</th>
                <th class="px-4 py-3">Tổng tiền</th>
                <th class="px-4 py-3">Trạng thái</th>
                <th class="px-4 py-3">Thanh toán</th>
                <th class="px-4 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="o in paginatedOrders"
                :key="o.id"
                :class="[
                  'border-b hover:bg-gray-200 transition-colors cursor-pointer odd:bg-gray-100 even:bg-white',
                  o.groupOrderId ? groupColorMap.get(o.groupOrderId) : '',
                ]"
                @click="openDetail(o)"
              >
                <td class="px-2 py-3 w-40 min-w-[150px]">
                  <div class="flex items-center gap-1.5 pr-4">
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

                <td class="px-4 py-3">
                  <div v-if="o.groupOrderId">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-200"
                    >
                      {{ o.groupName || "Chưa đặt tên" }}
                    </span>
                  </div>
                  <div v-else>
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
                    >
                      Đơn cá nhân
                    </span>
                  </div>
                </td>

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
                      'bg-orange-100 text-orange-700 px-2 py-1 rounded-full':
                        o.status === 'awaiting_payment',
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

                <!-- Thanh toán -->
                <td class="px-4 py-3">
                  <div v-if="o.paymentMethod === 'COD'">
                    <span class="font-semibold text-gray-700 text-sm">COD</span>
                  </div>

                  <div v-else class="flex flex-col items-start">
                    <span
                      class="font-bold text-gray-800 text-xs uppercase mb-0.5"
                    >
                      {{ o.paymentMethod }}
                    </span>

                    <span
                      class="text-xs font-medium"
                      :class="o.isPaid ? 'text-blue-600' : 'text-gray-500'"
                    >
                      {{ o.isPaid ? "● Đã thanh toán" : "○ Chưa thanh toán" }}
                    </span>
                  </div>
                </td>

                <!-- Hành động -->
                <td class="px-4 py-3 text-right">
                  <div class="flex justify-end gap-2">
                    <!-- Đơn nhóm: chỉ hiển thị 1 cặp nút cho order đầu tiên trong nhóm -->
                    <template v-if="o.groupOrderId">
                      <span
                        v-if="o.status === 'awaiting_payment'"
                        class="text-sm text-orange-600 italic"
                        >Chờ thanh toán...</span
                      >
                      <template v-if="groupFirstOrderIds.has(o.id)">
                        <button
                          v-if="o.status === 'pending'"
                          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-green-600 bg-green-600 text-white text-base font-medium hover:bg-green-700 active:bg-green-800 transition disabled:opacity-70 disabled:cursor-not-allowed"
                          @click.stop="approveGroup(o.groupOrderId)"
                          :disabled="processingGroupId === o.groupOrderId"
                        >
                          <Loader2 v-if="processingGroupId === o.groupOrderId" class="w-4 h-4 animate-spin" />
                          <Check v-else class="w-4 h-4" />
                          <span class="text-sm font-medium">Xác nhận nhóm</span>
                        </button>
                        <button
                          v-if="
                            o.status === 'pending' ||
                            o.status === 'awaiting_payment'
                          "
                          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-600 bg-red-600 text-white text-base font-medium hover:bg-red-700 active:bg-red-800 transition disabled:opacity-70 disabled:cursor-not-allowed"
                          @click.stop="rejectGroup(o.id, o.groupOrderId)"
                          :disabled="processingGroupId === o.groupOrderId"
                        >
                          <Loader2 v-if="processingGroupId === o.groupOrderId" class="w-4 h-4 animate-spin" />
                          <X v-else class="w-4 h-4" />
                          <span class="text-sm font-medium">Từ chối nhóm</span>
                        </button>
                      </template>
                      <span v-else class="text-sm text-gray-500 italic">-</span>
                    </template>

                    <!-- Đơn lẻ -->
                    <template v-else>
                      <span
                        v-if="o.status === 'awaiting_payment'"
                        class="text-sm text-orange-600 italic"
                        >Chờ thanh toán...</span
                      >
                      <button
                        v-if="o.status === 'pending'"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-green-600 bg-green-600 text-white text-base font-medium hover:bg-green-700 active:bg-green-800 transition disabled:opacity-70 disabled:cursor-not-allowed"
                        @click.stop="approveOrder(o.id)"
                        :disabled="processingOrderId === o.id"
                      >
                        <Loader2 v-if="processingOrderId === o.id" class="w-4 h-4 animate-spin" />
                        <Check v-else class="w-4 h-4" />
                        <span class="text-sm font-medium">Xác nhận</span>
                      </button>
                      <button
                        v-if="
                          o.status === 'pending' ||
                          o.status === 'awaiting_payment'
                        "
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-600 bg-red-600 text-white text-base font-medium hover:bg-red-700 active:bg-red-800 transition disabled:opacity-70 disabled:cursor-not-allowed"
                        @click.stop="rejectOrder(o.id)"
                        :disabled="processingOrderId === o.id"
                      >
                        <Loader2 v-if="processingOrderId === o.id" class="w-4 h-4 animate-spin" />
                        <X v-else class="w-4 h-4" />
                        <span class="text-sm font-medium">Từ chối</span>
                      </button>
                      <span v-else class="text-sm text-gray-500 italic">-</span>
                    </template>
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
          @approve="async (o) => {
            if (o.groupOrderId) await approveGroup(o.groupOrderId);
            else await approveOrder(o.id);
            showDetailModal = false;
          }"
          @reject="async (o) => {
            if (o.groupOrderId) await rejectGroup(o.id, o.groupOrderId);
            else await rejectOrder(o.id);
            showDetailModal = false;
          }"
        />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import Sidebar from "@/components/modals/staff/Sidebar.vue";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
const config = useRuntimeConfig();

const isOpen = ref(true);
const toggleSidebar = () => {
  isOpen.value = !isOpen.value;
};

const loading = ref(false);
const range = ref("30d");
const stats = ref(null);

const formatPrice = (v) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(v) || 0);

const formatRangeLabel = computed(() => {
  switch (range.value) {
    case "7d":
      return "7 ngày gần đây";
    case "30d":
      return "30 ngày gần đây";
    case "all":
      return "Toàn thời gian";
    default:
      return "";
  }
});

const fetchStats = async () => {
  loading.value = true;
  try {
    stats.value = await $fetch("/stats/staff/dashboard", {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      query: { range: range.value },
    });
  } catch (err) {
    console.error("Lỗi tải thống kê:", err);
    alert("Không thể tải thống kê, vui lòng thử lại.");
  } finally {
    loading.value = false;
  }
};

onMounted(fetchStats);

const changeRange = async (newRange) => {
  if (range.value === newRange) return;
  range.value = newRange;
  await fetchStats();
};

const ordersStatusMap = computed(() => {
  if (!stats.value?.ordersByStatus) return [];
  const labels = {
    awaiting_payment: "Chờ thanh toán",
    pending: "Đang chờ xác nhận",
    confirmed: "Đã xác nhận",
    rejected: "Bị từ chối",
    completed: "Đã hoàn thành",
    cancelled: "Đã hủy",
  };
  return stats.value.ordersByStatus.map((s) => ({
    ...s,
    label: labels[s.status] || s.status,
  }));
});

const hasRevenueChart = computed(
  () => stats.value?.revenueByDay && stats.value.revenueByDay.length > 0,
);
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex">
    <Sidebar :isOpen="isOpen" @toggle="toggleSidebar" />

    <main class="flex-1 p-6 space-y-6">
      <header class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">Thống kê bán hàng</h1>
          <p class="text-sm text-gray-500 mt-1">
            Tổng quan hiệu quả kinh doanh theo {{ formatRangeLabel }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="px-3 py-1.5 rounded-full text-xs border"
            :class="
              range === '7d'
                ? 'bg-black text-white border-black'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            "
            @click="changeRange('7d')"
          >
            7 ngày
          </button>
          <button
            class="px-3 py-1.5 rounded-full text-xs border"
            :class="
              range === '30d'
                ? 'bg-black text-white border-black'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            "
            @click="changeRange('30d')"
          >
            30 ngày
          </button>
          <button
            class="px-3 py-1.5 rounded-full text-xs border"
            :class="
              range === 'all'
                ? 'bg-black text-white border-black'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            "
            @click="changeRange('all')"
          >
            Toàn thời gian
          </button>
        </div>
      </header>

      <section v-if="loading" class="py-10 text-center text-gray-500">
        Đang tải thống kê...
      </section>

      <section v-else-if="stats" class="space-y-6">
        <!-- Cards tổng quan -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-1"
          >
            <span class="text-xs text-gray-500">Doanh thu</span>
            <span class="text-xl font-bold text-gray-900">
              {{ formatPrice(stats.summary.totalRevenue) }}
            </span>
          </div>
          <div
            class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-1"
          >
            <span class="text-xs text-gray-500">Số đơn hàng</span>
            <span class="text-xl font-bold text-gray-900">
              {{ stats.summary.totalOrders.toLocaleString("vi-VN") }}
            </span>
          </div>
          <div
            class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-1"
          >
            <span class="text-xs text-gray-500">Khách hàng</span>
            <span class="text-xl font-bold text-gray-900">
              {{ stats.summary.totalCustomers.toLocaleString("vi-VN") }}
            </span>
          </div>
          <div
            class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-1"
          >
            <span class="text-xs text-gray-500">Sản phẩm</span>
            <span class="text-xl font-bold text-gray-900">
              {{ stats.summary.totalProducts.toLocaleString("vi-VN") }}
            </span>
          </div>
        </div>

        <!-- 2 cột: đơn theo trạng thái + top sản phẩm -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div
            class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4"
          >
            <h2 class="text-sm font-semibold text-gray-800 mb-3">
              Đơn hàng theo trạng thái (toàn thời gian)
            </h2>
            <div v-if="ordersStatusMap.length" class="space-y-2 text-sm">
              <div
                v-for="item in ordersStatusMap"
                :key="item.status"
                class="flex items-center justify-between"
              >
                <span class="text-gray-600">{{ item.label }}</span>
                <span class="font-semibold text-gray-900">
                  {{ item.count.toLocaleString("vi-VN") }}
                </span>
              </div>
            </div>
            <p v-else class="text-xs text-gray-400">
              Chưa có dữ liệu đơn hàng.
            </p>
          </div>

          <div
            class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4"
          >
            <h2 class="text-sm font-semibold text-gray-800 mb-3">
              Top sản phẩm bán chạy
            </h2>
            <div v-if="stats.topProducts?.length" class="space-y-2 text-sm">
              <div
                v-for="p in stats.topProducts"
                :key="p.productId || p.name"
                class="flex items-center justify-between gap-3 border-b last:border-0 py-1.5"
              >
                <div class="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    class="w-10 h-10 rounded-md bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center"
                  >
                    <img
                      v-if="p.thumbnailUrl"
                      :src="p.thumbnailUrl"
                      :alt="p.name || 'Sản phẩm'"
                      class="w-full h-full object-cover"
                    />
                    <div
                      v-else
                      class="w-full h-full flex items-center justify-center text-[10px] text-gray-400"
                    >
                      N/A
                    </div>
                  </div>
                  <div class="min-w-0">
                    <p class="font-medium text-gray-800 truncate">
                      {{ p.name || "Sản phẩm đã xóa" }}
                    </p>
                    <p class="text-xs text-gray-500">
                      Số lượng: {{ p.totalQuantity.toLocaleString("vi-VN") }}
                    </p>
                  </div>
                </div>
                <span class="text-sm font-semibold text-gray-900">
                  {{ formatPrice(p.totalRevenue) }}
                </span>
              </div>
            </div>
            <p v-else class="text-xs text-gray-400">
              Chưa có dữ liệu sản phẩm.
            </p>
          </div>
        </div>

        <!-- Doanh thu theo ngày -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 class="text-sm font-semibold text-gray-800 mb-3">
            Doanh thu theo ngày ({{ formatRangeLabel }})
          </h2>
          <div v-if="hasRevenueChart" class="space-y-1 text-xs text-gray-600">
            <div
              v-for="d in stats.revenueByDay"
              :key="d.day"
              class="flex items-center gap-2"
            >
              <span class="w-24 text-gray-500">
                {{ new Date(d.day).toLocaleDateString("vi-VN") }}
              </span>
              <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-full bg-black rounded-full"
                  :style="{
                    width:
                      stats.summary.totalRevenue > 0
                        ? `${(d.revenue / stats.summary.totalRevenue) * 100}%`
                        : '0%',
                  }"
                ></div>
              </div>
              <span class="w-24 text-right font-medium text-gray-800">
                {{ formatPrice(d.revenue) }}
              </span>
            </div>
          </div>
          <p v-else class="text-xs text-gray-400">
            Chưa có dữ liệu doanh thu trong khoảng thời gian này.
          </p>
        </div>
      </section>

      <section v-else class="py-10 text-center text-gray-500">
        Chưa có dữ liệu thống kê.
      </section>
    </main>
  </div>
</template>

<script>
export default {
  middleware: "staff",
};
</script>

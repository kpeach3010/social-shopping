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

onMounted(() => {
  fetchStats();
  if (window.innerWidth < 1024) {
    isOpen.value = false;
  }
});

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

const maxDailyRevenue = computed(() => {
  if (!stats.value?.revenueByDay || !stats.value.revenueByDay.length) return 0;
  return stats.value.revenueByDay.reduce((max, d) => {
    const total = Number(d.totalRevenue || 0);
    return total > max ? total : max;
  }, 0);
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex">
    <Sidebar :isOpen="isOpen" @toggle="toggleSidebar" />

    <main class="flex-1 p-6 space-y-6">
      <header class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <!-- Nút toggle cho mobile -->
          <button
            @click="toggleSidebar"
            class="lg:hidden p-2 -ml-2 rounded-md hover:bg-gray-200 text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            <h1 class="text-xl md:text-2xl font-bold text-gray-800">Thống kê bán hàng</h1>
            <p class="text-xs md:text-sm text-gray-500 mt-1">
              Tổng quan hiệu quả kinh doanh theo {{ formatRangeLabel }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <button
            class="whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] md:text-xs border transition-colors"
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
            class="whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] md:text-xs border transition-colors"
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
            class="whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] md:text-xs border transition-colors"
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
          <h2 class="text-sm font-semibold text-gray-800 mb-1.5">
            Doanh thu theo ngày ({{ formatRangeLabel }})
          </h2>
          <div class="flex items-center gap-4 text-[11px] text-gray-500 mb-2">
            <div class="flex items-center gap-1">
              <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span>Đơn lẻ</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Đơn nhóm</span>
            </div>
            <span class="ml-auto"
              >Thanh dài nhất = ngày doanh thu cao nhất</span
            >
          </div>
          <div v-if="hasRevenueChart" class="space-y-1.5 text-xs text-gray-600">
            <div
              v-for="d in stats.revenueByDay"
              :key="d.day"
              class="flex items-center gap-2"
            >
              <span class="w-24 text-gray-500">
                {{ new Date(d.day).toLocaleDateString("vi-VN") }}
              </span>
              <div class="flex-1">
                <div class="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    class="h-full flex transition-all"
                    :style="{
                      width:
                        maxDailyRevenue > 0
                          ? `${(Number(d.totalRevenue || 0) / maxDailyRevenue) * 100}%`
                          : '0%',
                    }"
                  >
                    <div
                      v-if="Number(d.singleRevenue || 0) > 0"
                      class="h-full bg-blue-500 flex items-center justify-center text-[10px] text-white font-medium whitespace-nowrap px-1"
                      :title="`Đơn lẻ: ${formatPrice(d.singleRevenue)}`"
                      :style="{
                        width:
                          Number(d.totalRevenue || 0) > 0
                            ? `${(Number(d.singleRevenue || 0) / Number(d.totalRevenue || 1)) * 100}%`
                            : '0%',
                      }"
                    >
                      <span>
                        {{ formatPrice(d.singleRevenue) }}
                      </span>
                    </div>
                    <div
                      v-if="Number(d.groupRevenue || 0) > 0"
                      class="h-full bg-emerald-500 flex items-center justify-center text-[10px] text-white font-medium whitespace-nowrap px-1"
                      :title="`Đơn nhóm: ${formatPrice(d.groupRevenue)}`"
                      :style="{
                        width:
                          Number(d.totalRevenue || 0) > 0
                            ? `${(Number(d.groupRevenue || 0) / Number(d.totalRevenue || 1)) * 100}%`
                            : '0%',
                      }"
                    >
                      <span>
                        {{ formatPrice(d.groupRevenue) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <span class="w-32 text-right font-medium text-gray-800">
                {{ formatPrice(d.totalRevenue) }}
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

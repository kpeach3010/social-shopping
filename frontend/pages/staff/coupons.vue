<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { BadgePercent, PencilLine, Trash2, Loader2, Search, X as CloseIcon } from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";

import Sidebar from "@/components/modals/staff/Sidebar.vue";
import CreateCouponModal from "@/components/modals/staff/CreateCouponModal.vue";
import EditCouponModal from "@/components/modals/staff/EditCouponModal.vue";

const auth = useAuthStore();
const isOpen = ref(true);
const coupons = ref([]);
const loading = ref(false);
const isBulkDeleting = ref(false);
const deletingCouponIds = ref(new Set());
const config = useRuntimeConfig();
const showCreateModal = ref(false);
const showEditModal = ref(false);
const editCouponData = ref(null);
const searchKeyword = ref("");

// toggle sidebar
const toggleSidebar = () => {
  isOpen.value = !isOpen.value;
};

// fetch tất cả coupons
const fetchCoupons = async () => {
  loading.value = true;
  try {
    coupons.value = await $fetch("/coupons/all-coupons", {
      baseURL: config.public.apiBase,
    });
  } catch (e) {
    console.error("Fetch coupon lỗi:", e);
  } finally {
    loading.value = false;
  }
};
onMounted(() => {
  fetchCoupons();
  if (window.innerWidth < 1024) {
    isOpen.value = false;
  }
});

// format helper
const formatPrice = (v) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(Number(v) || 0);

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("vi-VN") : "");

// mở modal sửa
const openEditModal = (coupon) => {
  editCouponData.value = { ...coupon };
  showEditModal.value = true;
};

// ==========================
// MULTI SELECT + DELETE
// ==========================
const selectedIds = ref([]);

// Có tick hết ở trang hiện tại không
const isAllSelected = computed(
  () =>
    filteredCoupons.value.length > 0 &&
    filteredCoupons.value.every((c) => selectedIds.value.includes(c.id))
);

// Toggle tick hết
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value = [];
  } else {
    selectedIds.value = filteredCoupons.value.map((c) => c.id);
  }
};

// Toggle chọn từng item
const toggleSelect = (id) => {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter((x) => x !== id);
  } else {
    selectedIds.value.push(id);
  }
};

// Xóa 1 hoặc nhiều coupon
const deleteCoupons = async (ids) => {
  const arr = Array.isArray(ids) ? ids : [ids];
  if (!arr.length) return;

  if (!confirm(`Xác nhận xóa ${arr.length} coupon?`)) return;

  if (arr.length === 1) {
    deletingCouponIds.value.add(arr[0]);
  } else {
    isBulkDeleting.value = true;
  }

  try {
    await $fetch(`/coupons/delete-coupon/${arr.join(",")}`, {
      method: "DELETE",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    alert("Đã xóa!");
    selectedIds.value = [];
    fetchCoupons();
  } catch (err) {
    console.error("Delete lỗi:", err);
    const errorMsg = err?.response?._data?.error || "Không thể xóa coupon";
    alert(errorMsg);
  } finally {
    if (arr.length === 1) {
      deletingCouponIds.value.delete(arr[0]);
    } else {
      isBulkDeleting.value = false;
    }
  }
};

const filteredCoupons = computed(() => {
  if (!searchKeyword.value.trim()) return coupons.value;
  const q = searchKeyword.value.toLowerCase();
  return coupons.value.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
  );
});

// Reset selection on search
watch(searchKeyword, () => {
  selectedIds.value = [];
});
</script>

<template>
  <div class="flex min-h-screen bg-gray-50">
    <!-- Sidebar -->
    <Sidebar :isOpen="isOpen" @toggle="toggleSidebar" />

    <!-- Main -->
    <div class="flex-1 p-4 md:p-6 overflow-hidden flex flex-col min-w-0">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div class="flex items-center gap-3">
          <button
            @click="toggleSidebar"
            class="lg:hidden p-2 -ml-2 rounded-md hover:bg-gray-200 text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 class="text-xl md:text-2xl font-bold">Quản lý mã giảm giá</h1>
        </div>

        <div class="flex gap-2">
          <button
            v-if="selectedIds.length"
            @click="deleteCoupons(selectedIds)"
            :disabled="isBulkDeleting"
            class="px-3 py-1.5 md:px-4 md:py-2 bg-red-600 text-white rounded hover:bg-red-500 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 text-sm md:text-base"
          >
            <Loader2 v-if="isBulkDeleting" class="w-4 h-4 animate-spin" />
            <span>Xóa ({{ selectedIds.length }})</span>
          </button>

          <button
            class="w-full md:w-auto px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition text-sm md:text-base"
            @click="showCreateModal = true"
          >
            + Thêm mã giảm giá
          </button>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="mb-6 relative max-w-md group">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search class="h-5 w-5 text-gray-400 group-focus-within:text-black transition-colors" />
        </div>
        <input
          v-model="searchKeyword"
          type="text"
          placeholder="Tìm kiếm theo mã hoặc mô tả..."
          class="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-black transition-all text-sm"
        />
        <button
          v-if="searchKeyword"
          @click="searchKeyword = ''"
          class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-red-500 transition-colors"
        >
          <CloseIcon class="h-5 w-5" />
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-6 text-gray-500">
        Đang tải...
      </div>

      <!-- Table -->
      <div v-else class="overflow-x-auto bg-white rounded-lg shadow transition">
        <table class="min-w-full text-sm text-gray-700">
          <thead class="bg-gray-300 font-semibold text-gray-900">
            <tr>
              <th class="px-4 py-3 w-8 text-center">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  @change="toggleSelectAll"
                />
              </th>
              <th class="px-4 py-3">Mã</th>
              <th class="px-4 py-3">Mô tả</th>
              <th class="px-4 py-3">Loại</th>
              <th class="px-4 py-3">Hình thức</th>
              <th class="px-4 py-3">Giá trị</th>
              <th class="px-4 py-3">Bắt đầu</th>
              <th class="px-4 py-3">Kết thúc</th>
              <th class="px-4 py-3">Đã dùng</th>
              <th class="px-4 py-3 text-right">Hành động</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="c in filteredCoupons"
              :key="c.id"
              class="odd:bg-gray-100 even:bg-white hover:bg-gray-200 border-b"
            >
              <td class="px-4 py-3 text-center">
                <input
                  type="checkbox"
                  :checked="selectedIds.includes(c.id)"
                  @change="toggleSelect(c.id)"
                />
              </td>

              <td class="px-4 py-3 font-mono font-bold">
                {{ c.code }}
              </td>

              <td class="px-4 py-3">{{ c.description }}</td>

              <td class="px-4 py-3">
                {{ c.type === "percent" ? "Phần trăm" : "Cố định" }}
              </td>

              <td class="px-4 py-3">
                {{ c.kind === "group" ? "Mã nhóm" : "Mã cá nhân" }}
              </td>

              <td class="px-4 py-3">
                {{
                  c.type === "percent" ? c.value + "%" : formatPrice(c.value)
                }}
              </td>

              <td class="px-4 py-3">{{ formatDate(c.startsAt) }}</td>
              <td class="px-4 py-3">{{ formatDate(c.endsAt) }}</td>
              <td class="px-4 py-3">{{ c.used }}</td>

              <td class="px-4 py-3 text-right">
                <div class="flex justify-end gap-2">
                  <button
                    @click="openEditModal(c)"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-blue-500 text-blue-600 hover:bg-blue-50"
                  >
                    <PencilLine class="w-4 h-4" />
                    <span>Sửa</span>
                  </button>

                  <button
                    v-if="selectedIds.length === 0"
                    @click="deleteCoupons(c.id)"
                    :disabled="deletingCouponIds.has(c.id)"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 border border-red-600 text-white hover:bg-red-500 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <Loader2
                      v-if="deletingCouponIds.has(c.id)"
                      class="w-4 h-4 animate-spin"
                    />
                    <Trash2 v-else class="w-4 h-4" />
                    <span>Xóa</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredCoupons.length === 0">
              <td colspan="10" class="text-center py-6 text-gray-500">
                Không tìm thấy mã giảm giá phù hợp
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- MODALS -->
      <CreateCouponModal
        v-if="showCreateModal"
        @close="showCreateModal = false"
        @refresh="fetchCoupons"
      />

      <EditCouponModal
        v-if="showEditModal"
        :open="showEditModal"
        :couponData="editCouponData"
        @close="showEditModal = false"
        @refresh="fetchCoupons"
      />
    </div>
  </div>
</template>

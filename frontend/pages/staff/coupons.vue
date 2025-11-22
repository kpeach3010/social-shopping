<script setup>
import { ref, onMounted, computed } from "vue";
import { BadgePercent, PencilLine, Trash2 } from "lucide-vue-next";

import Sidebar from "@/components/modals/staff/Sidebar.vue";
import CreateCouponModal from "@/components/modals/staff/CreateCouponModal.vue";
import EditCouponModal from "@/components/modals/staff/EditCouponModal.vue";

const auth = useAuthStore();
const isOpen = ref(true);
const coupons = ref([]);
const loading = ref(false);

const showCreateModal = ref(false);
const showEditModal = ref(false);
const editCouponData = ref(null);

// toggle sidebar
const toggleSidebar = () => {
  isOpen.value = !isOpen.value;
};

// fetch tất cả coupons
const fetchCoupons = async () => {
  loading.value = true;
  try {
    coupons.value = await $fetch("/coupons/all-coupons", {
      baseURL: useRuntimeConfig().public.apiBase,
    });
  } catch (e) {
    console.error("Fetch coupon lỗi:", e);
  } finally {
    loading.value = false;
  }
};
onMounted(fetchCoupons);

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
    coupons.value.length > 0 &&
    coupons.value.every((c) => selectedIds.value.includes(c.id))
);

// Toggle tick hết
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value = [];
  } else {
    selectedIds.value = coupons.value.map((c) => c.id);
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

  if (!confirm(`Xác nhận xóa ${arr.length} coupon?`)) return;

  try {
    await $fetch(`/coupons/delete-coupon/${arr.join(",")}`, {
      method: "DELETE",
      baseURL: useRuntimeConfig().public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    alert("Đã xóa!");
    selectedIds.value = [];
    fetchCoupons();
  } catch (e) {
    console.error("Delete lỗi:", e);
    alert("Không thể xóa coupon");
  }
};
</script>

<template>
  <div class="flex min-h-screen bg-gray-50">
    <!-- Sidebar -->
    <Sidebar :isOpen="isOpen" @toggle="toggleSidebar" />

    <!-- Main -->
    <div class="flex-1 p-6">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">Quản lý mã giảm giá</h1>

        <div class="flex gap-2">
          <button
            v-if="selectedIds.length"
            @click="deleteCoupons(selectedIds)"
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500"
          >
            Xóa đã chọn ({{ selectedIds.length }})
          </button>

          <button
            class="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
            @click="showCreateModal = true"
          >
            + Thêm mã giảm giá
          </button>
        </div>
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
              v-for="c in coupons"
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
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 border border-red-600 text-white hover:bg-red-500"
                  >
                    <Trash2 class="w-4 h-4" />
                    <span>Xóa</span>
                  </button>
                </div>
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

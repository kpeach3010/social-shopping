<script setup>
import Header from "@/components/header.vue";
import { ref, onMounted } from "vue";
import { PencilLine, Trash2 } from "lucide-vue-next";
import Sidebar from "@/components/staff/Sidebar.vue";

const coupons = ref([]);
const loading = ref(false);
const showEditModal = ref(false);
const editCouponData = ref(null);
const auth = useAuthStore();
const isOpen = ref(true);
const toggleSidebar = () => {
  isOpen.value = !isOpen.value;
};

const fetchCoupons = async () => {
  loading.value = true;
  try {
    coupons.value = await $fetch(
      "http://localhost:5000/api/coupons/all-coupons"
    );
  } catch (err) {
    console.error("Lỗi fetch coupons:", err);
  } finally {
    loading.value = false;
  }
};

onMounted(fetchCoupons);

const formatPrice = (v) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(Number(v) || 0);
};

const formatDate = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("vi-VN");
};

const openEditModal = (coupon) => {
  editCouponData.value = { ...coupon };
  showEditModal.value = true;
};

const deleteCoupon = async (id) => {
  if (!confirm("Bạn có chắc muốn xóa mã giảm giá này?")) return;
  console.log("Xóa coupon với id:", id, typeof id);
  try {
    await $fetch(`http://localhost:5000/api/coupons/delete-coupon/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    await fetchCoupons();
    alert("Đã xóa mã giảm giá thành công!");
  } catch (err) {
    alert("Lỗi xóa mã giảm giá!");
    console.error(err);
  }
};
</script>

<template>
  <div class="flex min-h-screen bg-gray-50">
    <!-- Sidebar (reuse from products page) -->
    <Sidebar :isOpen="isOpen" @toggle="toggleSidebar" />
    <!-- Main -->
    <div class="flex-1 flex flex-col">
      <Header />
      <main class="flex-1 p-6">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold">Quản lý mã giảm giá</h1>
          <button
            class="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
          >
            + Thêm mã giảm giá
          </button>
        </div>
        <div v-if="loading" class="text-center py-6 text-gray-500">
          Đang tải...
        </div>
        <div
          v-else
          class="overflow-x-auto bg-white rounded-lg shadow transition"
        >
          <table
            class="min-w-full text-sm text-left text-gray-600 border-collapse"
          >
            <thead class="bg-gray-300 text-gray-800 font-semibold">
              <tr>
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
                class="odd:bg-gray-100 even:bg-white border-b hover:bg-gray-200 transition-colors"
              >
                <td class="px-4 py-3 font-mono font-bold">{{ c.code }}</td>
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
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-blue-500 text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition"
                      @click="openEditModal(c)"
                    >
                      <PencilLine class="w-4 h-4" />
                      <span class="text-sm">Sửa</span>
                    </button>
                    <button
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-600 bg-red-600 text-white hover:bg-red-500 active:bg-red-700 transition"
                      @click="deleteCoupon(c.id)"
                    >
                      <Trash2 class="w-4 h-4" />
                      <span class="text-sm">Xóa</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  </div>
</template>

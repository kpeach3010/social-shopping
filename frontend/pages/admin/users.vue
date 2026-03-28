<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import { UserPlus, Search, X as CloseIcon } from "lucide-vue-next";
import Pagination from "@/components/Pagination.vue";
import CreateStaffModal from "@/components/modals/admin/CreateStaffModal.vue";

const auth = useAuthStore();
const users = ref([]);
const loading = ref(false);

const showCreateModal = ref(false);
const searchQuery = ref("");
const currentPage = ref(1);
const perPage = 12;

const config = useRuntimeConfig();

const fetchUsers = async () => {
  loading.value = true;
  try {
    users.value = await $fetch("/users", {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
  } catch (err) {
    alert("Lỗi tải danh sách người dùng");
    console.error(err);
  } finally {
    loading.value = false;
  }
};

onMounted(fetchUsers);

// Filter
const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value;
  const q = searchQuery.value.toLowerCase();
  return users.value.filter(
    (u) =>
      u.fullName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q),
  );
});

// Pagination
const totalPages = computed(() => Math.ceil(filteredUsers.value.length / perPage));
const paginated = computed(() => {
  const start = (currentPage.value - 1) * perPage;
  return filteredUsers.value.slice(start, start + perPage);
});

// Reset page on search
watch(searchQuery, () => {
  currentPage.value = 1;
});

// Formatting
const roleLabel = (role) => {
  switch (role) {
    case "admin":
      return "Quản trị viên";
    case "staff":
      return "Nhân viên";
    default:
      return "Khách hàng";
  }
};

const statusClass = (status) =>
  ({
    active: "bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium",
    disabled: "bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium",
  }[status] || "");

const disableUser = async (id) => {
  if (!confirm("Vô hiệu hóa tài khoản này?")) return;
  try {
    await $fetch(`/users/disable/${id}`, {
      method: "PATCH",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    await fetchUsers();
    alert("Đã vô hiệu hóa tài khoản");
  } catch (err) {
    alert("Lỗi vô hiệu hóa");
  }
};

const enableUser = async (id) => {
  if (!confirm("Khôi phục tài khoản?")) return;
  try {
    await $fetch(`/users/enable/${id}`, {
      method: "PATCH",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    await fetchUsers();
    alert("Đã khôi phục tài khoản");
  } catch (err) {
    alert("Lỗi khôi phục");
  }
};
</script>

<template>
  <div class="p-4 md:p-8 min-h-screen bg-gray-50 flex flex-col min-w-0">
    <!-- Header: Pure Block structure to ensure stacking on mobile -->
    <div class="mb-8 md:flex md:items-center md:justify-between">
      <!-- Title Block -->
      <div class="mb-4 md:mb-0">
        <h1 class="text-xl md:text-2xl font-bold text-gray-800 whitespace-nowrap">
          Quản lý người dùng
        </h1>
      </div>

      <!-- Button Block -->
      <div class="w-full md:w-auto">
        <button
          @click="showCreateModal = true"
          class="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg shadow hover:bg-neutral-800 transition text-sm md:text-base whitespace-nowrap"
        >
          <UserPlus class="w-5 h-5" />
          <!-- xuống dòng -->
          <br>
          <span>Tạo nhân viên</span>
        </button>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="mb-6 relative max-w-md group">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search class="h-5 w-5 text-gray-400 group-focus-within:text-black transition-colors" />
      </div>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Tìm kiếm theo tên hoặc email..."
        class="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-black transition-all text-sm"
      />
      <button
        v-if="searchQuery"
        @click="searchQuery = ''"
        class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-red-500 transition-colors"
      >
        <CloseIcon class="h-5 w-5" />
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-6 text-gray-500">Đang tải...</div>

    <!-- Table -->
    <div v-else class="bg-white rounded-lg shadow overflow-x-auto">
      <table class="min-w-full text-sm text-left text-gray-700">
        <thead class="bg-gray-200 text-gray-800 font-semibold">
          <tr>
            <th class="px-4 py-3">Tên</th>
            <th class="px-4 py-3">Email</th>
            <th class="px-4 py-3">SĐT</th>
            <th class="px-4 py-3">Vai trò</th>
            <th class="px-4 py-3">Trạng thái</th>
            <th class="px-4 py-3">Ngày tạo</th>
            <th class="px-4 py-3 text-right">Hành động</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="u in paginated"
            :key="u.id"
            class="border-b odd:bg-gray-100 hover:bg-gray-200 transition"
          >
            <td class="px-4 py-3 font-semibold">{{ u.fullName }}</td>
            <td class="px-4 py-3">{{ u.email }}</td>
            <td class="px-4 py-3">{{ u.phone || "—" }}</td>
            <td class="px-4 py-3 font-medium">{{ roleLabel(u.role) }}</td>
            <td class="px-4 py-3">
              <span :class="statusClass(u.status)">
                {{ u.status === "active" ? "Hoạt động" : "Vô hiệu hóa" }}
              </span>
            </td>
            <td class="px-4 py-3">
              {{ new Date(u.createdAt).toLocaleString("vi-VN") }}
            </td>
            <td class="px-4 py-3 text-right">
              <button
                v-if="u.status === 'active'"
                class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                @click="disableUser(u.id)"
              >
                Vô hiệu
              </button>

              <button
                v-else
                class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                @click="enableUser(u.id)"
              >
                Khôi phục
              </button>
            </td>
          </tr>

          <tr v-if="paginated.length === 0">
            <td colspan="7" class="text-center py-6 text-gray-500">
              Không tìm thấy người dùng phù hợp
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <Pagination
        v-if="totalPages > 1"
        :totalPages="totalPages"
        :currentPage="currentPage"
        :total="filteredUsers.length"
        :perPage="perPage"
        @update:currentPage="(p) => (currentPage = p)"
      />
    </div>

    <!-- Modal tạo staff -->
    <CreateStaffModal
      :show="showCreateModal"
      @close="showCreateModal = false"
      @created="fetchUsers"
    />
  </div>
</template>

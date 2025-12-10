<script setup>
import { ref, computed, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import { UserPlus } from "lucide-vue-next";
import Pagination from "@/components/Pagination.vue";
import CreateStaffModal from "@/components/modals/admin/CreateStaffModal.vue";

const auth = useAuthStore();
const users = ref([]);
const loading = ref(false);

const showCreateModal = ref(false);

const currentPage = ref(1);
const perPage = 12;

// Đảm bảo dòng này đã có trong script setup của bạn
const config = useRuntimeConfig();

const fetchUsers = async () => {
  loading.value = true;
  try {
    // Sửa: Dùng đường dẫn tương đối và baseURL từ config
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

// Pagination
const totalPages = computed(() => Math.ceil(users.value.length / perPage));
const paginated = computed(() => {
  const start = (currentPage.value - 1) * perPage;
  return users.value.slice(start, start + perPage);
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

// Disable user
const disableUser = async (id) => {
  if (!confirm("Vô hiệu hóa tài khoản này?")) return;
  try {
    // Sửa: Dùng đường dẫn tương đối và baseURL từ config
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

// Enable user
const enableUser = async (id) => {
  if (!confirm("Khôi phục tài khoản?")) return;
  try {
    // Sửa: Dùng đường dẫn tương đối và baseURL từ config
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
  <div class="p-8 min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-800">Quản lý người dùng</h1>

      <button
        @click="showCreateModal = true"
        class="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg shadow hover:bg-neutral-800 transition"
      >
        <UserPlus class="w-5 h-5" />
        Tạo nhân viên
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-6 text-gray-500">Đang tải...</div>

    <!-- Table -->
    <div v-else class="bg-white rounded-lg shadow overflow-x-auto">
      <table class="min-w-full text-sm text-left text-gray-700">
        <thead class="bg-gray-200 text-gray-800 font-semibold">
          <tr>
            <!-- <th class="px-4 py-3 w-16">Avatar</th> -->
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
            <!-- Avatar -->
            <!-- <td class="px-4 py-3">
              <div
                class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-lg font-bold text-gray-700"
              >
                {{ u.fullName?.charAt(0) || "?" }}
              </div>
            </td> -->

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
            <td colspan="8" class="text-center py-6 text-gray-500">
              Không có người dùng
            </td>
          </tr>
        </tbody>
      </table>

      <Pagination
        v-if="totalPages > 1"
        :totalPages="totalPages"
        :currentPage="currentPage"
        :total="users.length"
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

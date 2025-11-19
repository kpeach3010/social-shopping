<script setup>
import { ref } from "vue";
import { useAuthStore } from "@/stores/auth";

const emit = defineEmits(["close", "created"]);

const props = defineProps({
  show: Boolean,
});

const auth = useAuthStore();
const config = useRuntimeConfig();

const staff = ref({
  fullName: "",
  email: "",
  password: "",
  phone: "",
  gender: "",
  dateOfBirth: "",
  province: "",
  district: "",
  ward: "",
  addressDetail: "",
});

const submitStaff = async () => {
  try {
    await $fetch("/users/create-staff", {
      method: "POST",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      body: staff.value,
    });

    alert("Tạo nhân viên thành công!");
    emit("created");
    emit("close");
  } catch (err) {
    console.error(err);
    alert("Lỗi tạo nhân viên!");
  }
};
</script>

<template>
  <div v-if="show" class="fixed inset-0 flex items-center justify-center z-50">
    <div
      class="absolute inset-0 bg-black/30 backdrop-blur-sm"
      @click="emit('close')"
    ></div>

    <div
      class="relative bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-hidden z-10 border"
    >
      <!-- Header -->
      <div
        class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center"
      >
        <h2 class="text-xl font-bold text-gray-800">Tạo nhân viên</h2>
        <button
          class="text-gray-400 hover:text-black text-xl"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- Form -->
      <div class="p-6 overflow-y-auto max-h-[70vh] pb-24 space-y-4">
        <input
          v-model="staff.fullName"
          class="w-full border px-3 py-2 rounded"
          placeholder="Họ tên"
        />
        <input
          v-model="staff.email"
          class="w-full border px-3 py-2 rounded"
          placeholder="Email"
        />
        <input
          v-model="staff.password"
          type="password"
          class="w-full border px-3 py-2 rounded"
          placeholder="Mật khẩu"
        />
        <input
          v-model="staff.phone"
          class="w-full border px-3 py-2 rounded"
          placeholder="Số điện thoại"
        />

        <select v-model="staff.gender" class="w-full border px-3 py-2 rounded">
          <option value="">Giới tính</option>
          <option value="male">Nam</option>
          <option value="female">Nữ</option>
        </select>

        <input
          v-model="staff.dateOfBirth"
          type="date"
          class="w-full border px-3 py-2 rounded"
        />

        <input
          v-model="staff.province"
          class="w-full border px-3 py-2 rounded"
          placeholder="Tỉnh"
        />
        <input
          v-model="staff.ddistrict"
          class="w-full border px-3 py-2 rounded"
          placeholder="Huyện"
        />
        <input
          v-model="staff.ward"
          class="w-full border px-3 py-2 rounded"
          placeholder="Xã"
        />
        <input
          v-model="staff.addressDetail"
          class="w-full border px-3 py-2 rounded"
          placeholder="Địa chỉ"
        />
      </div>

      <!-- Footer -->
      <div
        class="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3"
      >
        <button
          @click="submitStaff"
          class="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
        >
          Lưu nhân viên
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import { X } from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();

const props = defineProps({
  show: Boolean,
  userData: Object, // dữ liệu user cũ lấy từ BE
});
const emit = defineEmits(["close", "refresh"]);

// Clone user cho form
const user = ref({
  fullName: "",
  phone: "",
  gender: "",
  dateOfBirth: "",
  province: "",
  district: "",
  ward: "",
  addressDetail: "",
});

// Khi mở modal → clone data cũ vào form
watch(
  () => props.userData,
  (val) => {
    if (val) {
      user.value = { ...val }; // shallow clone
    }
  },
  { immediate: true }
);

// Gửi API
const submitUpdate = async () => {
  try {
    const payload = { ...user.value };
    const config = useRuntimeConfig();

    await $fetch("/users/profile", {
      method: "PATCH",
      baseURL: config.public.apiBase,
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        "Content-Type": "application/json",
      },
      body: payload,
    });
    auth.setAuth(payload);
    alert("Cập nhật thông tin thành công!");
    emit("refresh");
    emit("close");
  } catch (err) {
    console.error(err);
    alert("Lỗi khi cập nhật thông tin!");
  }
};
</script>

<template>
  <div v-if="show" class="fixed inset-0 flex items-center justify-center z-50">
    <!-- overlay -->
    <div
      class="absolute inset-0 bg-black/30 backdrop-blur-sm"
      @click="emit('close')"
    ></div>

    <!-- modal -->
    <div
      class="relative bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[85vh] overflow-hidden border z-10"
    >
      <!-- header -->
      <div
        class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center"
      >
        <h2 class="text-xl font-bold text-gray-800">
          Cập nhật thông tin cá nhân
        </h2>
        <button
          class="text-gray-400 hover:text-black text-xl"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- body -->
      <div class="p-6 space-y-4 overflow-y-auto max-h-[65vh]">
        <!-- Họ tên -->
        <div>
          <label class="font-semibold">Họ và tên</label>
          <input
            v-model="user.fullName"
            type="text"
            class="w-full border px-3 py-2 rounded mt-1"
          />
        </div>

        <!-- Số điện thoại -->
        <div>
          <label class="font-semibold">Số điện thoại</label>
          <input
            v-model="user.phone"
            type="text"
            class="w-full border px-3 py-2 rounded mt-1"
          />
        </div>

        <!-- Giới tính -->
        <div>
          <label class="font-semibold">Giới tính</label>
          <select
            v-model="user.gender"
            class="w-full border px-3 py-2 rounded mt-1"
          >
            <option value="">Chọn giới tính</option>
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
          </select>
        </div>

        <!-- Ngày sinh -->
        <div>
          <label class="font-semibold">Ngày sinh</label>
          <input
            v-model="user.dateOfBirth"
            type="date"
            class="w-full border px-3 py-2 rounded mt-1"
          />
        </div>

        <!-- Tỉnh / huyện / xã -->
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="font-semibold">Tỉnh / Thành phố</label>
            <input
              v-model="user.province"
              type="text"
              class="w-full border px-3 py-2 rounded mt-1"
            />
          </div>

          <div>
            <label class="font-semibold">Quận / Huyện</label>
            <input
              v-model="user.district"
              type="text"
              class="w-full border px-3 py-2 rounded mt-1"
            />
          </div>

          <div>
            <label class="font-semibold">Phường / Xã</label>
            <input
              v-model="user.ward"
              type="text"
              class="w-full border px-3 py-2 rounded mt-1"
            />
          </div>
        </div>

        <!-- Địa chỉ chi tiết -->
        <div>
          <label class="font-semibold">Địa chỉ chi tiết</label>
          <textarea
            v-model="user.addressDetail"
            rows="2"
            class="w-full border px-3 py-2 rounded mt-1"
          ></textarea>
        </div>
      </div>

      <!-- footer -->
      <div class="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end">
        <button
          @click="submitUpdate"
          class="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
        >
          Lưu thay đổi
        </button>
      </div>
    </div>
  </div>
</template>

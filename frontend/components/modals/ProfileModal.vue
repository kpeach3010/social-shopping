<script setup>
import { ref, watch, computed } from "vue";
import { X } from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";
import { ArrowPathIcon } from "@heroicons/vue/24/solid";

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

// Khi mở modal → clone data cũ vào form (shallow clone + xử lý date)
watch(
  () => props.userData,
  (val) => {
    if (val) {
      user.value = { ...val };
      // Backend thường trả về format date đầy đủ, ta chỉ lấy phần yyyy-mm-dd cho input date
      if (user.value.dateOfBirth) {
        user.value.dateOfBirth = user.value.dateOfBirth.split("T")[0];
      }
    }
  },
  { immediate: true }
);

const isSubmitting = ref(false);

// Validation Computed Properties
const fullNameError = computed(() => {
  if (!user.value.fullName?.trim()) return "";
  if (user.value.fullName.trim().length < 2) return "Họ tên quá ngắn";
  if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(user.value.fullName.trim()))
    return "Họ tên không được chứa số hoặc ký tự đặc biệt";
  return "";
});

const phoneError = computed(() => {
  if (!user.value.phone?.trim()) return "";
  const phoneRegex = /^(\+84|0)[3-9]\d{8}$/;
  if (!phoneRegex.test(user.value.phone.trim().replace(/\s/g, "")))
    return "Số điện thoại không hợp lệ";
  return "";
});

const provinceError = computed(() => {
  if (!user.value.province?.trim()) return "";
  if (/\d/.test(user.value.province)) return "Không được chứa số";
  return "";
});

const districtError = computed(() => {
  if (!user.value.district?.trim()) return "";
  if (/\d/.test(user.value.district)) return "Không được chứa số";
  return "";
});

const wardError = computed(() => {
  if (!user.value.ward?.trim()) return "";
  if (/\d/.test(user.value.ward)) return "Không được chứa số";
  return "";
});

const isFormValid = computed(() => {
  return (
    user.value.fullName?.trim() &&
    !fullNameError.value &&
    user.value.phone?.trim() &&
    !phoneError.value &&
    !provinceError.value &&
    !districtError.value &&
    !wardError.value
  );
});

// Gửi API
const submitUpdate = async () => {
  if (!isFormValid.value || isSubmitting.value) return;

  try {
    isSubmitting.value = true;
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

    // Cập nhật lại user trong store (sau khi load lại data hoặc force update)
    if (auth.loadFromStorage) await auth.loadFromStorage();
    
    alert("Cập nhật thông tin thành công!");
    emit("refresh");
    emit("close");
  } catch (err) {
    console.error(err);
    alert("Lỗi khi cập nhật thông tin!");
  } finally {
    isSubmitting.value = false;
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
      class="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[95vh] sm:max-h-[85vh] overflow-hidden border z-10 flex flex-col"
    >
      <!-- header -->
      <div
        class="sticky top-0 bg-white border-b px-4 sm:px-6 py-4 flex justify-between items-center z-20"
      >
        <h2 class="text-lg sm:text-xl font-bold text-gray-800">
          Cập nhật thông tin cá nhân
        </h2>
        <button
          class="text-gray-400 hover:text-black transition p-1"
          @click="emit('close')"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <!-- body -->
      <div class="p-4 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar">
        <!-- Họ tên -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">Họ và tên</label>
          <input
            v-model="user.fullName"
            type="text"
            :class="[
              'w-full border px-3 py-2 rounded-lg outline-none transition focus:ring-2 focus:ring-black/5',
              fullNameError ? 'border-red-500 bg-red-50' : 'border-gray-300'
            ]"
            placeholder="Nhập họ và tên"
          />
          <p v-if="fullNameError" class="text-xs text-red-600 mt-1">{{ fullNameError }}</p>
        </div>

        <!-- Số điện thoại -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">Số điện thoại</label>
          <input
            v-model="user.phone"
            type="text"
            :class="[
              'w-full border px-3 py-2 rounded-lg outline-none transition focus:ring-2 focus:ring-black/5',
              phoneError ? 'border-red-500 bg-red-50' : 'border-gray-300'
            ]"
            placeholder="Nhập số điện thoại"
          />
          <p v-if="phoneError" class="text-xs text-red-600 mt-1">{{ phoneError }}</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Giới tính -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Giới tính</label>
            <select
              v-model="user.gender"
              class="w-full border border-gray-300 px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-black/5"
            >
              <option value="">Chọn giới tính</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
            </select>
          </div>

          <!-- Ngày sinh -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Ngày sinh</label>
            <input
              v-model="user.dateOfBirth"
              type="date"
              class="w-full border border-gray-300 px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-black/5"
            />
          </div>
        </div>

        <!-- Tỉnh / huyện / xã -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Tỉnh / Thành phố</label>
            <input
              v-model="user.province"
              type="text"
              :class="[
                'w-full border px-3 py-2 rounded-lg outline-none transition focus:ring-2 focus:ring-black/5',
                provinceError ? 'border-red-500 bg-red-50' : 'border-gray-300'
              ]"
            />
            <p v-if="provinceError" class="text-[10px] text-red-600 mt-1">{{ provinceError }}</p>
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Quận / Huyện</label>
            <input
              v-model="user.district"
              type="text"
              :class="[
                'w-full border px-3 py-2 rounded-lg outline-none transition focus:ring-2 focus:ring-black/5',
                districtError ? 'border-red-500 bg-red-50' : 'border-gray-300'
              ]"
            />
            <p v-if="districtError" class="text-[10px] text-red-600 mt-1">{{ districtError }}</p>
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Phường / Xã</label>
            <input
              v-model="user.ward"
              type="text"
              :class="[
                'w-full border px-3 py-2 rounded-lg outline-none transition focus:ring-2 focus:ring-black/5',
                wardError ? 'border-red-500 bg-red-50' : 'border-gray-300'
              ]"
            />
            <p v-if="wardError" class="text-[10px] text-red-600 mt-1">{{ wardError }}</p>
          </div>
        </div>

        <!-- Địa chỉ chi tiết -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">Địa chỉ chi tiết</label>
          <textarea
            v-model="user.addressDetail"
            rows="2"
            class="w-full border border-gray-300 px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-black/5"
            placeholder="Số nhà, tên đường..."
          ></textarea>
        </div>
      </div>

      <!-- footer -->
      <div class="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3 z-20">
        <button
          @click="emit('close')"
          class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
        >
          Hủy
        </button>
        <button
          @click="submitUpdate"
          :disabled="!isFormValid || isSubmitting"
          :class="[
            'px-6 py-2 rounded-lg font-bold transition flex items-center justify-center gap-2 text-sm shadow-md active:scale-95',
            !isFormValid || isSubmitting
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-black text-white hover:bg-gray-800'
          ]"
        >
          <ArrowPathIcon
            v-if="isSubmitting"
            class="animate-spin h-4 w-4 text-white"
          />
          <span>{{ isSubmitting ? "Đang lưu..." : "Lưu thay đổi" }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

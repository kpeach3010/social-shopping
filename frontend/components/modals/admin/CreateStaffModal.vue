<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import { 
  XMarkIcon,
  ArrowPathIcon
} from "@heroicons/vue/24/outline";

const emit = defineEmits(["close", "created"]);

const props = defineProps({
  show: Boolean,
});

const auth = useAuthStore();
const config = useRuntimeConfig();
const isSubmitting = ref(false);
const isCreated = ref(false);

const form = reactive({
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

const errorMessage = ref("");

const resetForm = () => {
  form.fullName = "";
  form.email = "";
  form.password = "";
  form.phone = "";
  form.gender = "";
  form.dateOfBirth = "";
  form.province = "";
  form.district = "";
  form.ward = "";
  form.addressDetail = "";
  isCreated.value = false;
  errorMessage.value = "";
};

watch(() => props.show, (newVal) => {
  if (newVal) {
    resetForm();
  }
});

// Validation computed properties
const fullNameError = computed(() => {
  if (!form.fullName.trim()) return "";
  if (form.fullName.trim().length < 2) return "Họ tên phải có ít nhất 2 ký tự";
  if (form.fullName.trim().length > 50) return "Họ tên không được quá 50 ký tự";
  if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(form.fullName.trim()))
    return "Họ tên chỉ chứa chữ cái và khoảng trắng";
  return "";
});

const emailError = computed(() => {
  if (!form.email.trim()) return "";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(form.email.trim())) return "Địa chỉ email không hợp lệ";
  return "";
});

const phoneError = computed(() => {
  if (!form.phone.trim()) return "";
  const phoneRegex = /^(\+84|0)[3-9]\d{8}$/;
  if (!phoneRegex.test(form.phone.trim().replace(/\s/g, ""))) {
    return "Số điện thoại không hợp lệ (VD: 0912345678 hoặc +84912345678)";
  }
  return "";
});

const passwordError = computed(() => {
  if (!form.password.trim()) return "";
  if (form.password.length < 6) return "Mật khẩu phải có ít nhất 6 ký tự";
  if (form.password.length > 50) return "Mật khẩu không được quá 50 ký tự";
  return "";
});

const genderError = computed(() => {
  if (!form.gender.trim()) return "";
  if (!["male", "female"].includes(form.gender))
    return "Giới tính không hợp lệ";
  return "";
});

const dateOfBirthError = computed(() => {
  if (!form.dateOfBirth.trim()) return "";
  const birthDate = new Date(form.dateOfBirth);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();

  if (birthDate > today) return "Ngày sinh không thể là tương lai";
  if (age < 13) return "Bạn phải ít nhất 13 tuổi";
  if (age > 120) return "Tuổi không hợp lệ";
  return "";
});

const provinceError = computed(() => {
  if (!form.province.trim()) return "";
  if (/\d/.test(form.province)) return "Tên tỉnh/thành phố không được chứa số";
  if (form.province.trim().length < 2) return "Tên tỉnh/thành phố quá ngắn";
  if (form.province.trim().length > 50) return "Tên tỉnh/thành phố quá dài";
  return "";
});

const districtError = computed(() => {
  if (!form.district.trim()) return "";
  if (/\d/.test(form.district)) return "Tên quận/huyện không được chứa số";
  if (form.district.trim().length < 2) return "Tên quận/huyện quá ngắn";
  if (form.district.trim().length > 50) return "Tên quận/huyện quá dài";
  return "";
});

const wardError = computed(() => {
  if (!form.ward.trim()) return "";
  if (/\d/.test(form.ward)) return "Tên phường/xã không được chứa số";
  if (form.ward.trim().length < 2) return "Tên phường/xã quá ngắn";
  if (form.ward.trim().length > 50) return "Tên phường/xã quá dài";
  return "";
});

const addressDetailError = computed(() => {
  if (!form.addressDetail.trim()) return "";
  if (form.addressDetail.trim().length < 5) return "Địa chỉ chi tiết quá ngắn";
  if (form.addressDetail.trim().length > 200) return "Địa chỉ chi tiết quá dài";
  return "";
});

const isFormValid = computed(() => {
  return (
    !fullNameError.value &&
    !emailError.value &&
    !phoneError.value &&
    !passwordError.value &&
    !genderError.value &&
    !dateOfBirthError.value &&
    !provinceError.value &&
    !districtError.value &&
    !wardError.value &&
    !addressDetailError.value &&
    !isCreated.value &&
    form.fullName.trim() !== "" &&
    form.email.trim() !== "" &&
    form.phone.trim() !== "" &&
    form.password.trim() !== "" &&
    form.gender.trim() !== "" &&
    form.dateOfBirth.trim() !== "" &&
    form.province.trim() !== "" &&
    form.district.trim() !== "" &&
    form.ward.trim() !== "" &&
    form.addressDetail.trim() !== ""
  );
});

const submitStaff = async () => {
  if (!isFormValid.value) {
    errorMessage.value = "Vui lòng điền đầy đủ và chính xác các thông tin!";
    return;
  }
  
  isSubmitting.value = true;
  errorMessage.value = "";
  
  try {
    const payload = { ...form };
    if (payload.dateOfBirth) {
      const d = new Date(payload.dateOfBirth);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      payload.dateOfBirth = `${yyyy}-${mm}-${dd}`;
    }

    await $fetch("/users/create-staff", {
      method: "POST",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      body: payload,
    });

    // Success!
    isCreated.value = true;
    alert("Tạo tài khoản thành công!");
    emit("created");
    emit("close");
  } catch (err: any) {
    const e = err;
    const msg =
      e?.response?._data?.error ||
      e?.data?.error ||
      e?.message ||
      "Lỗi tạo nhân viên!";
    errorMessage.value = msg;
    console.error("Lỗi tạo nhân viên:", err);
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <Transition name="fade">
    <div v-if="show" class="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6 lg:p-8">
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
        @click="emit('close')"
      ></div>

      <!-- Modal Container -->
      <div
        class="relative bg-white sm:rounded-lg shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden z-10 font-sans"
      >
        <!-- Header -->
        <div class="px-8 py-6 border-b border-gray-200 flex justify-between items-center bg-white shrink-0">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">Thêm nhân viên mới </h2>
          </div>
          <button
            class="p-2 text-gray-400 hover:text-gray-900 transition-colors"
            @click="emit('close')"
          >
            <XMarkIcon class="h-6 w-6" />
          </button>
        </div>

        <!-- Scrollable content -->
        <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <form @submit.prevent="submitStaff" class="space-y-8">
            <div class="grid grid-cols-2 gap-6">
              <!-- Họ và tên -->
              <div>
                <label class="block text-sm font-medium text-gray-700">Họ và tên</label>
                <div class="mt-1">
                  <input
                    v-model="form.fullName"
                    type="text"
                    required
                    :class="[
                      'appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500',
                      fullNameError ? 'border-red-300' : 'border-gray-300',
                    ]"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <p v-if="fullNameError" class="text-xs text-red-600 mt-1">
                  {{ fullNameError }}
                </p>
              </div>

              <!-- Số điện thoại -->
              <div>
                <label class="block text-sm font-medium text-gray-700">Số điện thoại</label>
                <div class="mt-1">
                  <input
                    v-model="form.phone"
                    type="tel"
                    required
                    :class="[
                      'appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500',
                      phoneError ? 'border-red-300' : 'border-gray-300',
                    ]"
                    placeholder="0912 345 678"
                  />
                </div>
                <p v-if="phoneError" class="text-xs text-red-600 mt-1">
                  {{ phoneError }}
                </p>
              </div>

              <!-- Giới tính -->
              <div>
                <label class="block text-sm font-medium text-gray-700">Giới tính</label>
                <div class="mt-1">
                  <select
                    v-model="form.gender"
                    class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                  >
                    <option value="">Chọn giới tính</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                  </select>
                </div>
              </div>

              <!-- Ngày sinh -->
              <div>
                <label class="block text-sm font-medium text-gray-700">Ngày sinh</label>
                <div class="mt-1">
                  <input
                    v-model="form.dateOfBirth"
                    type="date"
                    required
                    :class="[
                      'appearance-none block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500',
                      dateOfBirthError ? 'border-red-300' : 'border-gray-300',
                    ]"
                  />
                </div>
                <p v-if="dateOfBirthError" class="text-xs text-red-600 mt-1">
                  {{ dateOfBirthError }}
                </p>
              </div>

              <!-- Email -->
              <div>
                <label class="block text-sm font-medium text-gray-700">Email đăng nhập</label>
                <div class="mt-1">
                  <input
                    v-model="form.email"
                    type="email"
                    required
                    :class="[
                      'appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500',
                      emailError ? 'border-red-300' : 'border-gray-300',
                    ]"
                    placeholder="staff@example.com"
                  />
                </div>
                <p v-if="emailError" class="text-xs text-red-600 mt-1">
                  {{ emailError }}
                </p>
              </div>

              <!-- Mật khẩu -->
              <div>
                <label class="block text-sm font-medium text-gray-700">Mật khẩu</label>
                <div class="mt-1">
                  <input
                    v-model="form.password"
                    type="password"
                    required
                    :class="[
                      'appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500',
                      passwordError ? 'border-red-300' : 'border-gray-300',
                    ]"
                    placeholder="••••••••"
                  />
                </div>
                <p v-if="passwordError" class="text-xs text-red-600 mt-1">
                  {{ passwordError }}
                </p>
              </div>

              <!-- Tỉnh/Thành phố -->
              <div>
                <label class="block text-sm font-medium text-gray-700">Tỉnh/Thành phố</label>
                <div class="mt-1">
                  <input
                    v-model="form.province"
                    type="text"
                    :class="[
                      'appearance-none block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500',
                      provinceError ? 'border-red-300' : 'border-gray-300',
                    ]"
                  />
                </div>
                <p v-if="provinceError" class="text-xs text-red-600 mt-1">
                  {{ provinceError }}
                </p>
              </div>

              <!-- Quận/Huyện -->
              <div>
                <label class="block text-sm font-medium text-gray-700">Quận/Huyện</label>
                <div class="mt-1">
                  <input
                    v-model="form.district"
                    type="text"
                    :class="[
                      'appearance-none block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500',
                      districtError ? 'border-red-300' : 'border-gray-300',
                    ]"
                  />
                </div>
                <p v-if="districtError" class="text-xs text-red-600 mt-1">
                  {{ districtError }}
                </p>
              </div>

              <!-- Phường/Xã -->
              <div>
                <label class="block text-sm font-medium text-gray-700">Phường/Xã</label>
                <div class="mt-1">
                  <input
                    v-model="form.ward"
                    type="text"
                    :class="[
                      'appearance-none block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500',
                      wardError ? 'border-red-300' : 'border-gray-300',
                    ]"
                  />
                </div>
                <p v-if="wardError" class="text-xs text-red-600 mt-1">
                  {{ wardError }}
                </p>
              </div>

              <!-- Địa chỉ chi tiết -->
              <div class="col-span-2">
                <label class="block text-sm font-medium text-gray-700">Địa chỉ chi tiết</label>
                <div class="mt-1">
                  <textarea
                    v-model="form.addressDetail"
                    rows="3"
                    :class="[
                      'appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500',
                      addressDetailError ? 'border-red-300' : 'border-gray-300',
                    ]"
                  ></textarea>
                </div>
                <p v-if="addressDetailError" class="text-xs text-red-600 mt-1">
                  {{ addressDetailError }}
                </p>
              </div>
            </div>

            <!-- Error Message -->
            <div v-if="errorMessage" class="text-red-600 text-sm">
              {{ errorMessage }}
            </div>
          </form>
        </div>

        <!-- Footer -->
        <div class="px-8 py-6 bg-white border-t border-gray-200 flex justify-end gap-3 shrink-0">
          <button
            @click="emit('close')"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Hủy bỏ
          </button>
          <button
            @click="submitStaff"
            :disabled="isSubmitting || !isFormValid"
            class="flex items-center justify-center gap-2 px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:bg-gray-400"
          >
            <ArrowPathIcon v-if="isSubmitting" class="animate-spin h-5 w-5 text-white" />
            <span>{{ isSubmitting ? "Đang xử lý..." : "Lưu nhân viên" }}</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}
</style>

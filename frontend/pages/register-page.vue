<template>
  <div
    class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans"
  >
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h2 class="text-center text-3xl font-extrabold text-gray-900">
        Đăng ký tài khoản
      </h2>

      <p class="text-center text-gray-600">
        Hãy đăng ký để trải nghiệm mua sắm tuyệt vời cùng chúng tôi!
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-4xl">
      <div class="bg-white py-10 px-8 shadow-xl sm:rounded-lg font-sans">
        <!-- Success Screen -->
        <div v-if="showSuccessScreen" class="text-center py-8">
          <div class="flex justify-center mb-4">
            <div class="bg-green-100 p-4 rounded-full">
              <CheckCircleIcon class="w-12 h-12 text-green-600" />
            </div>
          </div>
          <h3 class="text-2xl font-bold text-gray-900 mb-3">
            Đăng ký thành công!
          </h3>
          <p class="text-gray-600 mb-2">
            Vui lòng kiểm tra email của bạn để xác nhận tài khoản trước khi đăng
            nhập
          </p>

          <p class="text-sm text-red-600 italic mb-6">
            Lưu ý: Email chỉ có hiệu lực trong 1 giờ kể từ khi nhận được
          </p>
          <p class="text-sm text-gray-500">
            Bạn sẽ được chuyển hướng đến trang đăng nhập sau 5 giây...
          </p>
        </div>

        <form v-else @submit.prevent="onSubmit">
          <div class="grid grid-cols-2 gap-6">
            <!-- Họ và tên -->
            <div>
              <label class="block text-sm font-medium text-gray-700">
                Họ và tên
              </label>
              <div class="mt-1">
                <input
                  v-model="form.fullName"
                  type="text"
                  required
                  :class="[
                    'appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500',
                    fullNameError ? 'border-red-300' : 'border-gray-300',
                  ]"
                />
              </div>
              <p v-if="fullNameError" class="text-sm text-red-600 mt-1">
                {{ fullNameError }}
              </p>
            </div>

            <!-- Số điện thoại -->
            <div>
              <label class="block text-sm font-medium text-gray-700">
                Số điện thoại
              </label>
              <div class="mt-1">
                <input
                  v-model="form.phone"
                  type="tel"
                  required
                  :class="[
                    'appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500',
                    phoneError ? 'border-red-300' : 'border-gray-300',
                  ]"
                />
              </div>
              <p v-if="phoneError" class="text-sm text-red-600 mt-1">
                {{ phoneError }}
              </p>
            </div>

            <!-- Giới tính -->
            <div>
              <label class="block text-sm font-medium text-gray-700">
                Giới tính
              </label>
              <div class="mt-1">
                <select
                  v-model="form.gender"
                  :class="[
                    'block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500',
                    genderError ? 'border-red-300' : 'border-gray-300',
                  ]"
                >
                  <option value="">Chọn giới tính</option>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                </select>
              </div>
              <p v-if="genderError" class="text-sm text-red-600 mt-1">
                {{ genderError }}
              </p>
            </div>

            <!-- Ngày sinh -->
            <div>
              <label class="block text-sm font-medium text-gray-700">
                Ngày sinh
              </label>
              <div class="mt-1">
                <input
                  v-model="form.dateOfBirth"
                  type="date"
                  required
                  :class="[
                    'appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500',
                    dateOfBirthError ? 'border-red-300' : 'border-gray-300',
                  ]"
                />
              </div>
              <p v-if="dateOfBirthError" class="text-sm text-red-600 mt-1">
                {{ dateOfBirthError }}
              </p>
            </div>

            <!-- Email -->
            <div>
              <label class="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div class="mt-1">
                <input
                  v-model="form.email"
                  type="email"
                  required
                  :class="[
                    'appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500',
                    emailError ? 'border-red-300' : 'border-gray-300',
                  ]"
                />
              </div>
              <p v-if="emailError" class="text-sm text-red-600 mt-1">
                {{ emailError }}
              </p>
            </div>

            <!-- Tỉnh/Thành phố -->
            <div>
              <label class="block text-sm font-medium text-gray-700">
                Tỉnh/Thành phố
              </label>
              <div class="mt-1">
                <input
                  v-model="form.province"
                  type="text"
                  placeholder="Nhập Tỉnh/Thành phố"
                  :class="[
                    'appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500',
                    provinceError ? 'border-red-300' : 'border-gray-300',
                  ]"
                />
              </div>
              <p v-if="provinceError" class="text-sm text-red-600 mt-1">
                {{ provinceError }}
              </p>
            </div>

            <!-- Mật khẩu -->
            <div>
              <label class="block text-sm font-medium text-gray-700">
                Mật khẩu
              </label>
              <div class="mt-1 relative">
                <input
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Lớn hơn 5 ký tự"
                  required
                  :class="[
                    'appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 pr-10',
                    passwordError ? 'border-red-300' : 'border-gray-300',
                  ]"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <EyeIcon v-if="!showPassword" class="h-5 w-5" />
                  <EyeSlashIcon v-else class="h-5 w-5" />
                </button>
              </div>
              <p v-if="passwordError" class="text-sm text-red-600 mt-1">
                {{ passwordError }}
              </p>
            </div>

            <!-- Quận/Huyện -->
            <div>
              <label class="block text-sm font-medium text-gray-700">
                Quận/Huyện
              </label>
              <div class="mt-1">
                <input
                  v-model="form.district"
                  type="text"
                  placeholder="Nhập Quận/Huyện"
                  :class="[
                    'appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500',
                    districtError ? 'border-red-300' : 'border-gray-300',
                  ]"
                />
              </div>
              <p v-if="districtError" class="text-sm text-red-600 mt-1">
                {{ districtError }}
              </p>
            </div>

            <!-- Nhập lại mật khẩu -->
            <div>
              <label class="block text-sm font-medium text-gray-700">
                Nhập lại mật khẩu
              </label>
              <div class="mt-1 relative">
                <input
                  v-model="form.confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  required
                  :class="[
                    'appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 pr-10',
                    confirmPasswordError ? 'border-red-300' : 'border-gray-300',
                  ]"
                />
                <button
                  type="button"
                  @click="showConfirmPassword = !showConfirmPassword"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <EyeIcon v-if="!showConfirmPassword" class="h-5 w-5" />
                  <EyeSlashIcon v-else class="h-5 w-5" />
                </button>
              </div>
              <p v-if="confirmPasswordError" class="text-sm text-red-600 mt-1">
                {{ confirmPasswordError }}
              </p>
            </div>

            <!-- Phường/Xã -->
            <div>
              <label class="block text-sm font-medium text-gray-700">
                Phường/Xã
              </label>
              <div class="mt-1">
                <input
                  v-model="form.ward"
                  type="text"
                  placeholder="Nhập Phường/Xã"
                  :class="[
                    'appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500',
                    wardError ? 'border-red-300' : 'border-gray-300',
                  ]"
                />
              </div>
              <p v-if="wardError" class="text-sm text-red-600 mt-1">
                {{ wardError }}
              </p>
            </div>

            <!-- Địa chỉ chi tiết -->
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-700">
                Địa chỉ chi tiết
              </label>
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
              <p v-if="addressDetailError" class="text-sm text-red-600 mt-1">
                {{ addressDetailError }}
              </p>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="errorMessage" class="text-red-600 mt-4 text-sm">
            {{ errorMessage }}
          </div>

          <!-- Submit Button -->
          <div class="mt-6">
            <button
              type="submit"
              :disabled="!isFormValid || isSubmitting"
              :class="[
                'w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200',
                !isFormValid || isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed hover:bg-gray-400'
                  : 'bg-black hover:bg-gray-800',
              ]"
            >
              <ArrowPathIcon
                v-if="isSubmitting"
                class="animate-spin h-5 w-5 text-white"
              />
              <span>{{ isSubmitting ? "Đang xử lý..." : "Đăng ký" }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckCircleIcon, ArrowPathIcon, EyeIcon, EyeSlashIcon } from "@heroicons/vue/24/solid";
definePageMeta({ layout: false });
import { reactive, ref, computed } from "vue";

const config = useRuntimeConfig();
const errorMessage = ref("");
const isSubmitting = ref(false);
const showSuccessScreen = ref(false);
const showPassword = ref(false);
const showConfirmPassword = ref(false);

const form = reactive({
  email: "",
  password: "",
  confirmPassword: "",
  fullName: "",
  phone: "",
  gender: "",
  dateOfBirth: "",
  province: "",
  district: "",
  ward: "",
  addressDetail: "",
});

const isFormValid = computed(() => {
  return (
    !fullNameError.value &&
    !emailError.value &&
    !phoneError.value &&
    !passwordError.value &&
    !confirmPasswordError.value &&
    !genderError.value &&
    !dateOfBirthError.value &&
    !provinceError.value &&
    !districtError.value &&
    !wardError.value &&
    !addressDetailError.value &&
    form.fullName.trim() !== "" &&
    form.email.trim() !== "" &&
    form.phone.trim() !== "" &&
    form.password.trim() !== "" &&
    form.confirmPassword.trim() !== "" &&
    form.gender.trim() !== "" &&
    form.dateOfBirth.trim() !== "" &&
    form.province.trim() !== "" &&
    form.district.trim() !== "" &&
    form.ward.trim() !== "" &&
    form.addressDetail.trim() !== ""
  );
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

const confirmPasswordError = computed(() => {
  if (!form.confirmPassword.trim()) return "";
  if (form.confirmPassword !== form.password)
    return "Mật khẩu nhập lại không khớp";
  return "";
});

const genderError = computed(() => {
  // Không hiển thị lỗi khi chưa chọn gì
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
  if (form.province.trim().length < 2) return "Tên tỉnh/thành phố quá ngắn";
  if (form.province.trim().length > 50) return "Tên tỉnh/thành phố quá dài";
  return "";
});

const districtError = computed(() => {
  if (!form.district.trim()) return "";
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

const onSubmit = async () => {
  isSubmitting.value = true;

  // Kiểm tra khớp mật khẩu trước khi gửi
  if (form.password !== form.confirmPassword) {
    errorMessage.value = "Mật khẩu nhập lại không khớp";
    isSubmitting.value = false;
    return;
  }
  try {
    // Clone form
    const payload = { ...form };

    // Chuẩn hóa dateOfBirth
    if (payload.dateOfBirth) {
      const d = new Date(payload.dateOfBirth);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      payload.dateOfBirth = `${yyyy}-${mm}-${dd}`;
    }
    console.log("Payload gửi lên:", payload);

    const res = await $fetch("/auth/register", {
      method: "POST",
      baseURL: config.public.apiBase,
      headers: {
        "Content-Type": "application/json",
      },
      body: payload,
    });

    console.log("Đăng ký thành công:", res);

    // Hiển thị success screen
    showSuccessScreen.value = true;

    // Đợi 5000ms (5 giây) sau đó chuyển hướng đến trang đăng nhập
    setTimeout(() => {
      navigateTo("/login-page", { replace: true });
    }, 5000);
  } catch (err) {
    const e = err as any;
    const msg =
      e?.response?._data?.error ||
      e?.data?.error ||
      e?.message ||
      "Đăng ký thất bại";
    errorMessage.value = msg;
    console.error("Lỗi đăng ký:", err);
  } finally {
    isSubmitting.value = false;
  }
};
</script>

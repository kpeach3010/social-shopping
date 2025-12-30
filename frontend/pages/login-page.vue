<template>
  <div
    class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans"
  >
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h2 class="text-center text-3xl font-extrabold text-gray-900">
        Đăng nhập
      </h2>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10 font-sans">
        <form class="space-y-6" @submit.prevent="onSubmit">
          <!-- Email -->
          <div>
            <label class="block text-sm font-medium text-gray-700">Email</label>
            <div class="mt-1">
              <input
                v-model="form.email"
                type="email"
                required
                placeholder="Nhập email"
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
          </div>

          <!-- Mật khẩu -->
          <div>
            <label class="block text-sm font-medium text-gray-700"
              >Mật khẩu</label
            >
            <div class="mt-1 relative">
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                required
                placeholder="Nhập mật khẩu"
                class="appearance-none block w-full px-3 py-2 pr-24 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 px-4 flex items-center text-gray-600 hover:text-black focus:outline-none"
                @click="showPassword = !showPassword"
                aria-label="Toggle password visibility"
              >
                <EyeSlashIcon v-if="showPassword" class="h-5 w-5" />
                <EyeIcon v-else class="h-5 w-5" />
              </button>
            </div>
          </div>

          <!-- Thông báo lỗi -->
          <p
            v-if="errorMessage"
            class="text-red-600 text-sm font-medium mt-2 transition-opacity duration-300"
          >
            {{ errorMessage }}
          </p>

          <div class="mt-6 text-center">
            <p class="text-sm text-gray-600">
              Bạn chưa có tài khoản?
              <button
                @click="goToRegister"
                type="button"
                class="font-medium text-black hover:text-gray-800 focus:outline-none focus:underline transition-colors duration-200"
              >
                Đăng ký
              </button>
            </p>
          </div>
          <!-- Nút đăng nhập -->
          <div>
            <button
              type="submit"
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
            >
              Đăng nhập
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: false });

import { useAuthStore } from "@/stores/auth";
import { EyeIcon, EyeSlashIcon } from "@heroicons/vue/24/outline";

const form = reactive({
  email: "",
  password: "",
});

const showPassword = ref(false);

const errorMessage = ref(null);
const config = useRuntimeConfig();
const authStore = useAuthStore();

const goToRegister = () => {
  navigateTo("/register-page");
};

const onSubmit = async () => {
  errorMessage.value = null;
  const payload = { ...form };
  console.log("Payload gửi lên:", payload);

  try {
    const res = await $fetch("/auth/login", {
      method: "POST",
      baseURL: config.public.apiBase,
      headers: {
        "Content-Type": "application/json",
      },
      body: payload,
    });

    // lưu token và user vào store
    authStore.setAuth(
      res.user,
      res.accessToken,
      res.refreshToken || res.session?.refresh_token
    );

    // redirect theo role
    if (res.user.role === "staff") {
      navigateTo("/staff/products");
    } else if (res.user.role === "admin") {
      navigateTo("/admin/users");
    } else {
      navigateTo("/");
    }
  } catch (err) {
    console.error("Lỗi đăng nhập:", err);
    const apiError =
      err?.response?._data?.error || err?.data?.error || err?.message;
    errorMessage.value = apiError || "Có lỗi xảy ra, vui lòng thử lại";
  }
};
</script>

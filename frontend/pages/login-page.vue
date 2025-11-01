<template>
  <div
    class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8"
  >
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h2 class="text-center text-3xl font-extrabold text-gray-900">
        Đăng nhập
      </h2>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10">
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
            <div class="mt-1">
              <input
                v-model="form.password"
                type="password"
                required
                placeholder="Nhập mật khẩu"
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
          </div>

          <!-- Thông báo lỗi -->
          <p
            v-if="errorMessage"
            class="text-red-600 text-sm font-medium mt-2 transition-opacity duration-300"
          >
            {{ errorMessage }}
          </p>

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

const form = reactive({
  email: "",
  password: "",
});

const errorMessage = ref(null);
const config = useRuntimeConfig();
const authStore = useAuthStore();

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
    authStore.setAuth(res.user, res.accessToken, res.refreshToken);

    // redirect theo role
    if (res.user.role === "staff") {
      navigateTo("/staff/products");
    } else if (res.user.role === "admin") {
      navigateTo("/admin");
    } else {
      navigateTo("/");
    }
  } catch (err) {
    console.error("Lỗi đăng nhập:", err);
    if (err?.response?._data?.error) {
      errorMessage.value = "Email hoặc mật khẩu không chính xác";
    } else {
      errorMessage.value = "Có lỗi xảy ra, vui lòng thử lại";
    }
  }
};
</script>

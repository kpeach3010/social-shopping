<template>
  <div class="min-h-screen flex items-center justify-center p-6 bg-gray-50">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-md p-6 text-center">
      <div class="flex justify-center mb-4">
        <div class="bg-green-100 p-3 rounded-full">
          <svg
            class="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
      </div>

      <h1 class="text-xl font-semibold mb-2">Email đã được xác thực</h1>
      <p class="text-gray-600 text-sm mb-6">
        Tài khoản của bạn đã sẵn sàng. Bạn có thể tiếp tục đăng nhập để truy cập
        hệ thống.
      </p>

      <NuxtLink
        :to="loginUrl"
        class="block w-full py-3 rounded-lg bg-green-600 text-white font-medium hover:brightness-95 transition mb-3"
      >
        Đăng nhập
      </NuxtLink>

      <NuxtLink
        :to="homeUrl"
        class="block w-full py-3 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
      >
        Về trang chủ
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
const route = useRoute();
const config = useRuntimeConfig();
const baseUrl = (config.public.baseUrl || "").replace(/\/$/, "");

// fallback mặc định dùng baseUrl
const loginUrl = `${baseUrl}/login-page`;
const homeUrl = `${baseUrl}/`;
</script>

<style scoped></style>

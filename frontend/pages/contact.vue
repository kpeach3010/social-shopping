<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-20 max-w-4xl">
      <div class="bg-white rounded-xl shadow-lg p-12 md:p-16 text-center">
        <div
          class="w-24 h-24 mx-auto mb-8 rounded-full bg-blue-100 flex items-center justify-center"
        >
          <svg
            class="w-12 h-12 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            ></path>
          </svg>
        </div>

        <h1 class="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
          Liên hệ
        </h1>
        <p class="text-xl text-gray-600 mb-12">
          Trang liên hệ đang được phát triển
        </p>

        <div class="space-y-6 max-w-md mx-auto mb-12">
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <svg
                class="w-6 h-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                ></path>
              </svg>
            </div>
            <span class="text-gray-700 text-lg">support@socialshop.com</span>
          </div>

          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <svg
                class="w-6 h-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                ></path>
              </svg>
            </div>
            <span class="text-gray-700 text-lg">1900-1234</span>
          </div>
        </div>

        <div>
          <NuxtLink
            to="/"
            class="inline-flex items-center px-8 py-4 bg-black text-white rounded-lg hover:bg-gray-800 transition text-lg font-medium"
          >
            Về trang chủ
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// SEO
useHead({
  title: "Liên hệ",
});
</script>

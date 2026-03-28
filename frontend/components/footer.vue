<template>
  <footer class="bg-gray-100 text-gray-600 py-8">
    <div
      class="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left"
    >
      <!-- Logo + mô tả -->
      <div class="flex flex-col items-center md:items-start">
        <NuxtLink to="/" class="flex items-center gap-2 text-xl font-black text-green-600 mb-3 hover:opacity-80 transition">
          <img src="/logo.png" alt="SocialShop Logo" class="h-8 w-auto object-contain" />
          <span>SocialShop</span>
        </NuxtLink>
        <p class="text-sm leading-relaxed max-w-xs">
          Nền tảng mua sắm trực tuyến kết nối bạn bè, mang lại trải nghiệm mua sắm cộng đồng tiện lợi và tiết kiệm.
        </p>
      </div>

      <!-- Về chúng tôi -->
      <div>
        <h3 class="text-gray-900 font-bold mb-4 uppercase text-xs tracking-wider">Thông tin</h3>
        <ul class="space-y-2 text-sm">
          <li>
            <NuxtLink to="/about" class="hover:text-green-600 transition-colors">Giới thiệu về SocialShop</NuxtLink>
          </li>
          <li>
            <NuxtLink to="/contact" class="hover:text-green-600 transition-colors">Liên hệ & Hỗ trợ</NuxtLink>
          </li>
          <li>
            <NuxtLink to="#" class="hover:text-green-600 transition-colors">Chính sách bảo mật</NuxtLink>
          </li>
        </ul>
      </div>

      <!-- Kết nối -->
      <div>
        <h3 class="text-gray-900 font-bold mb-4 uppercase text-xs tracking-wider">Kết nối với chúng tôi</h3>
        <div class="flex justify-center md:justify-start space-x-6">
          <a href="#" class="text-gray-500 hover:text-[#1877F2] transition-colors" title="Facebook">
            <span class="text-sm font-medium">Facebook</span>
          </a>
          <a href="#" class="text-gray-500 hover:text-[#E4405F] transition-colors" title="Instagram">
            <span class="text-sm font-medium">Instagram</span>
          </a>
          <a href="#" class="text-gray-500 hover:text-[#1DA1F2] transition-colors" title="Twitter">
            <span class="text-sm font-medium">Twitter</span>
          </a>
        </div>
      </div>
    </div>

    <!-- Bản quyền -->
    <div
      class="mt-6 border-t border-gray-300 pt-4 text-center text-sm text-gray-500"
    >
      © 2025 SocialShop. All rights reserved.
    </div>
  </footer>
</template>

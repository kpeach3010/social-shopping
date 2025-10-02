<template>
  <footer class="bg-gray-100 text-gray-600 py-8">
    <div
      class="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left"
    >
      <!-- Logo + mô tả -->
      <div>
        <h2 class="text-lg font-bold text-black mb-2">🛍 SocialShop</h2>
        <p class="text-sm">Mua sắm tiện lợi cùng bạn bè.</p>
      </div>

      <!-- Về chúng tôi -->
      <div>
        <h3 class="text-black font-semibold mb-2">Về chúng tôi</h3>
        <ul class="space-y-1 text-sm">
          <li>
            <NuxtLink to="/about" class="hover:text-black">Giới thiệu</NuxtLink>
          </li>
          <li>
            <NuxtLink to="/contact" class="hover:text-black">Liên hệ</NuxtLink>
          </li>
        </ul>
      </div>

      <!-- Kết nối -->
      <div>
        <h3 class="text-black font-semibold mb-2">Kết nối</h3>
        <div class="flex justify-center md:justify-start space-x-4">
          <a href="#" class="hover:text-black">Facebook</a>
          <a href="#" class="hover:text-black">Instagram</a>
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

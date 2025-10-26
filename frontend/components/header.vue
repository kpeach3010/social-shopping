<template>
  <header class="bg-white shadow-md">
    <div class="container mx-auto px-4 py-3 flex items-center justify-between">
      <!-- Logo + Menu -->
      <div class="flex items-center space-x-6">
        <NuxtLink to="/" class="text-xl font-bold text-black">
          🛍 SocialShop
        </NuxtLink>

        <!-- Trang chủ -->
        <NuxtLink to="/" class="text-gray-700 hover:text-black">
          Trang chủ
        </NuxtLink>

        <!-- Danh mục có dropdown -->
        <div class="relative group">
          <!-- Nút -->
          <button class="text-gray-700 hover:text-black px-4 py-2">
            Danh mục
          </button>

          <!-- Menu chính -->
          <div
            class="absolute left-0 top-full bg-white shadow-lg rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 delay-100 z-50 flex"
          >
            <!-- Cột danh mục cha -->
            <ul class="w-48 border-r">
              <li
                v-for="cat in categories"
                :key="cat.id"
                class="relative group/parent"
              >
                <!-- Danh mục cha -->
                <NuxtLink
                  :to="`/category/${cat.id}`"
                  class="block px-4 py-2 hover:bg-gray-100 font-medium cursor-pointer"
                >
                  {{ cat.name }}
                </NuxtLink>

                <!-- Submenu -->
                <ul
                  v-if="cat.children && cat.children.length"
                  class="absolute top-0 left-full w-56 bg-white shadow-md rounded-md opacity-0 invisible group-hover/parent:opacity-100 group-hover/parent:visible transition"
                >
                  <li v-for="child in cat.children" :key="child.id">
                    <NuxtLink
                      :to="`/category/${child.id}`"
                      class="block px-4 py-2 hover:bg-gray-100 text-sm text-gray-600 cursor-pointer"
                    >
                      {{ child.name }}
                    </NuxtLink>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <!-- Thanh tìm kiếm -->
      <div class="flex-1 mx-6">
        <ProductSearchBox />
      </div>

      <!-- Auth -->
      <div class="flex items-center space-x-4">
        <template v-if="!auth.isLoggedIn">
          <NuxtLink
            to="/login-page"
            class="px-4 py-2 text-sm font-medium text-white bg-black rounded hover:bg-gray-800"
          >
            Đăng nhập
          </NuxtLink>
          <NuxtLink
            to="/register-page"
            class="px-4 py-2 text-sm font-medium text-black border border-black rounded hover:bg-gray-100"
          >
            Đăng ký
          </NuxtLink>
        </template>
        <template v-else>
          <!-- Cart -->
          <NuxtLink
            to="/cart"
            class="relative flex items-center text-gray-700 hover:text-black"
          >
            <div class="relative" v-if="auth.user?.role !== 'staff'">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                class="w-6 h-6"
              >
                <path
                  d="M2.25 2.25a.75.75 0 0 0 0 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 0 0-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 0 0 0-1.5H5.378A2.25 2.25 0 0 1 7.5 15h11.218a.75.75 0 0 0 .674-.421 60.358 60.358 0 0 0 2.96-7.228.75.75 0 0 0-.525-.965A60.864 60.864 0 0 0 5.68 4.509l-.232-.867A1.875 1.875 0 0 0 3.636 2.25H2.25ZM3.75 20.25a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM16.5 20.25a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z"
                />
              </svg>
              <span
                v-if="cartCount > 0"
                class="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full px-1"
              >
                {{ cartCount }}
              </span>
            </div>
          </NuxtLink>

          <!-- chat -->
          <ChatDropdown v-if="auth.isLoggedIn" />

          <!-- User -->
          <!-- User Dropdown -->
          <div class="relative group">
            <button
              class="flex items-center space-x-1 text-gray-700 hover:text-black"
            >
              <!-- Icon user -->
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="w-6 h-6"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 
               0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 
               8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
              </svg>

              <!-- Tên user -->
              <span class="text-sm font-medium">
                {{ auth.user?.fullName || "Khách" }}
              </span>

              <!-- Mũi tên -->
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="w-4 h-4"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m19.5 8.25-7.5 7.5-7.5-7.5"
                />
              </svg>
            </button>

            <!-- Dropdown menu -->
            <div
              class="absolute right-0 top-full mt-0 w-40 bg-white border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-200 delay-100 z-50"
            >
              <NuxtLink
                to="/profile"
                class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Tài khoản của tôi
              </NuxtLink>

              <!-- Chỉ hiện khi role = staff -->
              <NuxtLink
                v-if="auth.user?.role === 'staff'"
                to="/staff/products"
                class="block px-4 py-2 text-sm text-blue-600 font-medium hover:bg-gray-100"
              >
                Quản lý cửa hàng
              </NuxtLink>

              <button
                @click="auth.logout()"
                class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </header>
</template>

<
<script setup>
import ProductSearchBox from "~/components/ProductSearchBox.vue";
import ChatDropdown from "~/components/chat/ChatDropdown.vue";

import { useAuthStore } from "~/stores/auth";
import { ref, onMounted } from "vue";

const config = useRuntimeConfig();
const auth = useAuthStore();
auth.loadFromStorage(); // load token khi header render

const cartCount = ref(0);
const categories = ref([]);

// hàm load giỏ hàng
const loadCartCount = async () => {
  if (auth.user?.role === "staff") return; // Bỏ qua nếu là staff
  try {
    const res = await $fetch("/cart/get-cart-items", {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    // tính tổng số lượng từ DB
    cartCount.value = res.items.reduce((sum, item) => sum + item.quantity, 0);
  } catch (err) {
    console.error("Lỗi load cart count:", err);
  }
};

onMounted(async () => {
  try {
    const res = await $fetch("/category/all-categories", {
      baseURL: config.public.apiBase,
    });

    // Xây dựng cây cha-con từ danh sách phẳng
    const map = {};
    res.forEach((cat) => {
      map[cat.id] = { ...cat, children: [] };
    });

    const tree = [];
    res.forEach((cat) => {
      if (cat.parentId) {
        map[cat.parentId].children.push(map[cat.id]);
      } else {
        tree.push(map[cat.id]);
      }
    });

    categories.value = tree; // gán vào biến categories để render
  } catch (err) {
    console.error("Lỗi lấy category:", err);
  }
  // load cart count thật
  await loadCartCount();
});
</script>

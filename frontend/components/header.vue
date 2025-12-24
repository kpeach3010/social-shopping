<template>
  <header class="bg-white shadow-md">
    <div class="container mx-auto px-4 py-3 flex items-center justify-between">
      <!-- Logo + Menu -->
      <div class="flex items-center space-x-6">
        <NuxtLink to="/" class="text-xl font-bold text-black"
          >🛍 SocialShop</NuxtLink
        >
        <NuxtLink to="/" class="text-gray-700 hover:text-black"
          >Trang chủ</NuxtLink
        >
        <NuxtLink
          to="/feed"
          class="flex items-center gap-1 text-gray-700 hover:text-black"
          ><FireIcon class="w-5 h-5" />NEW FEED</NuxtLink
        >

        <!-- Danh mục -->
        <div class="relative group">
          <button class="text-gray-700 hover:text-black px-4 py-2">
            Danh mục
          </button>
          <div
            class="absolute left-0 top-full bg-white shadow-lg rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 delay-100 z-50 flex"
          >
            <ul class="w-48 border-r">
              <li
                v-for="cat in categories"
                :key="cat.id"
                class="relative group/parent"
              >
                <NuxtLink
                  :to="`/category/${cat.id}`"
                  class="block px-4 py-2 hover:bg-gray-100 font-medium"
                >
                  {{ cat.name }}
                </NuxtLink>
                <ul
                  v-if="cat.children?.length"
                  class="absolute top-0 left-full w-56 bg-white shadow-md rounded-md opacity-0 invisible group-hover/parent:opacity-100 group-hover/parent:visible transition"
                >
                  <li v-for="child in cat.children" :key="child.id">
                    <NuxtLink
                      :to="`/category/${child.id}`"
                      class="block px-4 py-2 hover:bg-gray-100 text-sm text-gray-600"
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
      <div class="flex items-center space-x-4" :key="headerKey">
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
          <!-- Giỏ hàng -->

          <NuxtLink
            to="/cart"
            v-if="auth.user?.role !== 'staff' && auth.user?.role !== 'admin'"
            class="relative flex items-center text-gray-700 hover:text-black focus:outline-none focus-visible:outline-none focus:ring-0 active:outline-none"
            tabindex="-1"
          >
            <div class="relative inline-block">
              <ShoppingCartIcon class="w-6 h-6" />
              <span
                v-if="cartCount > 0"
                class="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-semibold rounded-full min-w-[16px] h-[16px] flex items-center justify-center"
              >
                {{ cartCount }}
              </span>
            </div>
          </NuxtLink>

          <!-- Chat -->
          <div class="relative flex items-center space-x-2">
            <ChatDropdown />
            <BellIcon class="w-6 h-6 text-gray-700 hover:text-black" />
          </div>

          <!-- Dropdown user -->
          <div class="relative group">
            <button
              class="flex items-center space-x-1 text-gray-700 hover:text-black"
            >
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
              <span class="text-sm font-medium">{{ userDisplayName }}</span>
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

            <div
              class="absolute right-0 top-full mt-0 w-40 bg-white border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-200 delay-100 z-50"
            >
              <div class="py-1">
                <NuxtLink
                  to="/my-feed"
                  class="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-black transition"
                >
                  <i class="bx bx-news text-lg text-gray-400"></i>
                  <span>Trang cá nhân</span>
                </NuxtLink>
                <NuxtLink
                  to="/profile"
                  class="block px-4 py-2 text-sm hover:bg-gray-100"
                >
                  Tài khoản của tôi
                </NuxtLink>
                <NuxtLink
                  v-if="auth.user?.role === 'staff'"
                  to="/staff/products"
                  class="block px-4 py-2 text-sm text-blue-600 font-medium hover:bg-gray-100"
                >
                  Quản lý cửa hàng
                </NuxtLink>
                <button
                  @click="handleLogout"
                  class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </header>
</template>

<script setup>
import ProductSearchBox from "~/components/ProductSearchBox.vue";
import ChatDropdown from "~/components/chat/ChatDropdown.vue";
import {
  ShoppingCartIcon,
  BellIcon,
  FireIcon,
} from "@heroicons/vue/24/outline";
import { useAuthStore } from "~/stores/auth";
import { useChatStore } from "~/stores/chat";
import { ref, computed, onMounted, watch, onBeforeUnmount } from "vue";

const auth = useAuthStore();
const config = useRuntimeConfig();

const headerKey = computed(() =>
  auth.isLoggedIn ? "logged-in" : "logged-out"
);
// Prefer full name display but fall back to other available fields
const userDisplayName = computed(() => {
  const u = auth.user || {};
  // common fields returned by different backends: fullName, full_name, name, firstName/lastName
  if (!u || Object.keys(u).length === 0) return "Khách";
  if (u.fullName && String(u.fullName).trim()) return String(u.fullName).trim();
  if (u.full_name && String(u.full_name).trim())
    return String(u.full_name).trim();
  if (u.name && String(u.name).trim()) return String(u.name).trim();
  if (u.email && String(u.email).trim()) return String(u.email).trim();
  return "Khách";
});
const categories = ref([]);
const cartCount = ref(0);
const chatStore = useChatStore();
let __authChangedHandler = null;

const loadCartCount = async () => {
  if (!auth.isLoggedIn || auth.user?.role === "staff") return;
  try {
    const res = await $fetch("/cart/get-cart-items", {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    cartCount.value = res.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
  } catch (err) {
    cartCount.value = 0;
  }
};

watch(
  () => auth.isLoggedIn,
  async (loggedIn) => {
    cartCount.value = 0;
    if (loggedIn) await loadCartCount();
  }
);

const handleLogout = () => {
  console.log("Header: logout clicked");
  auth.logout();
  cartCount.value = 0;
  // Force a full reload to ensure all in-memory state is cleared and UI updates
  if (process.client) {
    window.location.href = "/";
  }
};

onMounted(async () => {
  // initialize from localStorage quickly to avoid UI flash
  if (process.client) {
    const savedCart = localStorage.getItem("cartCount");
    if (savedCart) cartCount.value = parseInt(savedCart) || 0;
    const savedUnread = localStorage.getItem("unreadCount");
    if (savedUnread) {
      try {
        chatStore.setUnreadCount(parseInt(savedUnread) || 0);
      } catch (e) {}
    }
  }
  const res = await $fetch("/category/all-categories", {
    baseURL: config.public.apiBase,
  });
  const map = {};
  res.forEach((cat) => (map[cat.id] = { ...cat, children: [] }));
  const tree = [];
  res.forEach((cat) => {
    if (cat.parentId) map[cat.parentId]?.children.push(map[cat.id]);
    else tree.push(map[cat.id]);
  });
  categories.value = tree;
  await loadCartCount();

  // Listen to auth changes (login / refresh / logout)
  __authChangedHandler = async () => {
    try {
      if (process.client) {
        console.log("[header] auth-changed received. store before load:", {
          user: auth.user,
          accessToken: auth.accessToken
            ? auth.accessToken.slice(0, 10) + "..."
            : null,
        });

        await auth.loadFromStorage();

        console.log("[header] after loadFromStorage:", {
          user: auth.user,
          accessToken: auth.accessToken
            ? auth.accessToken.slice(0, 10) + "..."
            : null,
        });

        // Đồng bộ lại giỏ hàng từ localStorage ngay lập tức
        const savedCart = localStorage.getItem("cartCount");
        if (savedCart) cartCount.value = parseInt(savedCart) || 0;
      }

      if (auth.isLoggedIn) {
        try {
          await loadCartCount();
        } catch (e) {
          console.warn("loadCartCount() failed, fallback to localStorage:", e);
        }

        // Cập nhật số tin chưa đọc
        try {
          const r = await $fetch("/messages/unread-count", {
            baseURL: config.public.apiBase,
            headers: { Authorization: `Bearer ${auth.accessToken}` },
          });
          if (r && typeof r.unreadCount !== "undefined")
            chatStore.setUnreadCount(r.unreadCount || 0);
        } catch (e) {
          console.warn("Could not refresh unread count on auth change", e);
        }
      } else {
        // Nếu logout hoặc token invalid
        cartCount.value = 0;
        try {
          chatStore.clearUnread();
        } catch (e) {}
      }
    } catch (e) {
      console.warn("auth-changed handler failed", e);
    }
  };

  if (process.client)
    window.addEventListener("auth-changed", __authChangedHandler);
  // listen for cart-updated event dispatched by interceptor after refresh
  const __cartUpdatedHandler = async (e) => {
    try {
      const c = e?.detail?.count;

      // Nếu sự kiện có gửi kèm số lượng thì dùng luôn
      if (typeof c === "number") {
        cartCount.value = c;
      } else {
        // Nếu không có số lượng (sự kiện trống), thì gọi API load lại
        await loadCartCount();
      }
    } catch (err) {
      console.warn("cart-updated handler error", err);
    }
  };
  if (process.client)
    window.addEventListener("cart-updated", __cartUpdatedHandler);
  // remove handler on unmount
  onBeforeUnmount(() => {
    if (process.client && __cartUpdatedHandler)
      window.removeEventListener("cart-updated", __cartUpdatedHandler);
  });
});

onBeforeUnmount(() => {
  if (process.client && __authChangedHandler) {
    window.removeEventListener("auth-changed", __authChangedHandler);
    __authChangedHandler = null;
  }
});
</script>

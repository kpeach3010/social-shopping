<template>
  <div class="flex flex-col min-h-screen">
    <!-- Banner -->
    <section class="relative">
      <img
        src="/banner.png"
        alt="Banner giới thiệu"
        class="w-full h-[400px] object-cover"
      />
    </section>

    <!-- Loading -->
    <div
      v-if="loading"
      class="flex flex-col items-center justify-center min-h-[300px] py-16"
    >
      <div
        class="animate-spin rounded-full h-10 w-10 border-b-2 border-black mb-4"
      ></div>
    </div>

    <!-- Danh sách sản phẩm -->
    <section v-else class="container mx-auto px-4 py-10">
      <div class="text-center">
        <h2 class="text-2xl font-bold mb-6">TẤT CẢ SẢN PHẨM</h2>
      </div>

      <!-- Bộ lọc -->
      <div class="flex justify-end mb-4 relative" ref="filterDropdown">
        <button
          @click="showFilter = !showFilter"
          class="flex items-center gap-2 px-3 py-2 border rounded hover:bg-gray-100"
        >
          <FunnelIcon class="w-5 h-5" />
          <span>Lọc giá</span>
        </button>

        <!-- Dropdown -->
        <div
          v-if="showFilter"
          class="absolute right-0 mt-12 bg-white border rounded shadow-md w-40 z-50"
        >
          <button
            class="w-full text-left px-4 py-2 hover:bg-gray-100"
            @click="filterByPrice('asc')"
          >
            Giá thấp → cao
          </button>
          <button
            class="w-full text-left px-4 py-2 hover:bg-gray-100"
            @click="filterByPrice('desc')"
          >
            Giá cao → thấp
          </button>
        </div>
      </div>

      <div
        class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
      >
        <div
          v-for="product in paginatedProducts"
          :key="product.id"
          class="border rounded-lg shadow-sm hover:shadow-lg transition"
        >
          <!-- Ảnh -->
          <NuxtLink :to="`/product/${product.id}`">
            <div class="w-full h-56 bg-white rounded-t-lg overflow-hidden flex items-center justify-center">
              <img
                :src="product.thumbnailUrl"
                :alt="product.name"
                class="w-full h-full object-contain"
              />
            </div>
          </NuxtLink>

          <!-- Nội dung -->
          <div class="p-4 flex flex-col justify-between bg-gray-100 rounded-b-lg">
            <NuxtLink :to="`/product/${product.id}`">
              <h3 class="font-semibold text-gray-800 mb-2 truncate">
                {{ product.name }}
              </h3>
            </NuxtLink>

            <p class="text-gray-600 font-medium">
              {{
                Number(product.price_default || product.price).toLocaleString(
                  "vi-VN",
                )
              }}
              đ
            </p>

            <!-- Nút xem chi tiết -->
            <NuxtLink
              :to="`/product/${product.id}`"
              class="mt-3 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 text-center"
            >
              Xem chi tiết
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>
    <!-- Phân trang FE -->
    <!-- Pagination -->
    <div
      v-if="!loading"
      class="flex justify-center items-center gap-2 mt-12 pb-8 select-none"
    >
      <!-- Prev -->
      <button
        @click="page > 1 && page--"
        :disabled="page === 1"
        class="px-4 py-2 border rounded-lg text-sm transition hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
      >
        ← Trước
      </button>

      <!-- Page number -->
      <div
        class="px-4 py-2 font-medium text-gray-700 bg-gray-50 border rounded-lg"
      >
        Trang {{ page }} / {{ totalPages }}
      </div>

      <!-- Next -->
      <button
        @click="page < totalPages && page++"
        :disabled="page === totalPages"
        class="px-4 py-2 border rounded-lg text-sm transition hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
      >
        Sau →
      </button>
    </div>
  </div>
</template>

<script setup>
import { FunnelIcon } from "@heroicons/vue/24/outline";

const showFilter = ref(false);
const filterDropdown = ref(null);
const config = useRuntimeConfig();
const products = ref([]);
const loading = ref(true);
const page = ref(1);
const limit = 12; // mỗi trang 12 sản phẩm
const paginatedProducts = computed(() => {
  const start = (page.value - 1) * limit;
  return products.value.slice(start, start + limit);
});

const totalPages = computed(() => {
  return Math.ceil(products.value.length / limit);
});

// Đóng dropdown khi click bên ngoài
const handleClickOutside = (event) => {
  if (filterDropdown.value && !filterDropdown.value.contains(event.target)) {
    showFilter.value = false;
  }
};

// Thêm/bỏ event listener cho click outside
onMounted(async () => {
  document.addEventListener("click", handleClickOutside);
  try {
    const res = await $fetch("/product/all-products", {
      baseURL: config.public.apiBase,
    });
    products.value = res;
  } catch (err) {
    console.error("Lỗi fetch products:", err);
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});

const filterByPrice = async (sort) => {
  showFilter.value = false; // đóng dropdown

  try {
    const res = await $fetch(`/product/products-by-price?sort=${sort}`, {
      baseURL: config.public.apiBase,
    });
    products.value = res.data || res;
  } catch (err) {
    console.error("Lỗi lọc sản phẩm:", err);
  }
};
</script>

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

    <!-- Danh sách sản phẩm -->
    <section class="container mx-auto px-4 py-10">
      <div class="text-center">
        <h2 class="text-2xl font-bold mb-6">TẤT CẢ SẢN PHẨM</h2>
      </div>

      <!-- Bộ lọc -->
      <div class="flex justify-end mb-4 relative">
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
          v-for="product in products"
          :key="product.id"
          class="border rounded-lg shadow-sm hover:shadow-lg transition bg-white"
        >
          <!-- Ảnh -->
          <NuxtLink :to="`/product/${product.id}`">
            <img
              :src="product.thumbnailUrl"
              :alt="product.name"
              class="w-full h-48 object-cover rounded-t-lg"
            />
          </NuxtLink>

          <!-- Nội dung -->
          <div class="p-4 flex flex-col justify-between">
            <NuxtLink :to="`/product/${product.id}`">
              <h3 class="font-semibold text-gray-800 mb-2 truncate">
                {{ product.name }}
              </h3>
            </NuxtLink>

            <p class="text-gray-600 font-medium">
              {{
                Number(product.price_default || product.price).toLocaleString(
                  "vi-VN"
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
  </div>
</template>

<script setup>
import { FunnelIcon } from "@heroicons/vue/24/outline";

const showFilter = ref(false);
const config = useRuntimeConfig();
const products = ref([]);
onMounted(async () => {
  try {
    const res = await $fetch("/product/all-products", {
      baseURL: config.public.apiBase,
    });
    products.value = res;
  } catch (err) {
    console.error("Lỗi fetch products:", err);
  }
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

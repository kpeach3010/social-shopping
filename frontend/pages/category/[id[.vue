<template>
  <div>
    <main class="container mx-auto px-6 py-10">
      <!-- Tiêu đề danh mục -->
      <h2 class="text-xl font-bold mb-6">
        <template v-if="parentCategory"> {{ parentCategory.name }} > </template>
        {{ category?.name }}
      </h2>

      <!-- Loading -->
      <div v-if="loading" class="text-center text-gray-500">Đang tải...</div>

      <!-- Bộ lọc -->
      <div
        v-if="!loading && products.length"
        class="flex justify-end mb-4 relative"
      >
        <button
          @click="showFilter = !showFilter"
          class="flex items-center gap-2 px-3 py-2 border rounded hover:bg-gray-100"
        >
          <FunnelIcon class="w-5 h-5 text-gray-700" />
          <span>Lọc giá</span>
        </button>

        <!-- Dropdown -->
        <div
          v-if="showFilter"
          class="absolute right-0 mt-12 bg-white border rounded shadow-md w-48 z-50"
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

      <!-- Grid sản phẩm -->
      <div
        v-if="!loading && products.length"
        class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
      >
        <div
          v-for="p in products"
          :key="p.id"
          class="border rounded-lg shadow-sm hover:shadow-lg transition bg-white"
        >
          <img
            :src="p.thumbnailUrl"
            :alt="p.name"
            class="w-full h-48 object-cover rounded-t-lg"
          />

          <div class="p-4 flex flex-col justify-between">
            <h3 class="font-semibold text-gray-800 mb-2 truncate">
              {{ p.name }}
            </h3>
            <p class="text-gray-600">
              {{ formatPrice(p.price || p.price_default) }}
            </p>

            <NuxtLink
              :to="`/product/${p.id}`"
              class="mt-3 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 text-center"
            >
              Xem chi tiết
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Không có sản phẩm -->
      <div v-else-if="!loading" class="text-center text-gray-500">
        Không có sản phẩm nào trong danh mục này.
      </div>
    </main>
  </div>
</template>

<script setup>
import { FunnelIcon } from "@heroicons/vue/24/outline";

const route = useRoute();
const config = useRuntimeConfig();

const showFilter = ref(false);
const category = ref(null);
const parentCategory = ref(null);
const products = ref([]);
const loading = ref(true);

// Format giá
const formatPrice = (v) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(Number(v) || 0);

// Lọc theo giá
const filterByPrice = async (sort) => {
  showFilter.value = false;

  try {
    const res = await $fetch(`/product/products-by-price?sort=${sort}`, {
      baseURL: config.public.apiBase,
    });

    products.value = res.data || res;
  } catch (err) {
    console.error("Lỗi lọc sản phẩm:", err);
  }
};

// Load category & sản phẩm ban đầu
onMounted(async () => {
  try {
    const res = await $fetch(`/category/category/${route.params.id}`, {
      baseURL: config.public.apiBase,
    });
    category.value = res;

    if (res.parentId) {
      const parent = await $fetch(`/category/category/${res.parentId}`, {
        baseURL: config.public.apiBase,
      });
      parentCategory.value = parent;
    }

    const prods = await $fetch(`/category/${route.params.id}/products`, {
      baseURL: config.public.apiBase,
    });

    products.value = prods;
  } catch (e) {
    console.error("Lỗi load category:", e);
  } finally {
    loading.value = false;
  }
});
</script>

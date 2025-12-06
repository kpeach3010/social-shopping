<template>
  <div>
    <div class="container mx-auto px-4 py-8 min-h-[60vh]">
      <!-- Title -->
      <h1 class="text-2xl font-bold mb-6">
        Kết quả tìm kiếm cho:
        <span class="text-black">"{{ $route.query.name }}"</span>
      </h1>

      <!-- Loading -->
      <div v-if="loading" class="text-gray-500">Đang tìm kiếm...</div>

      <!-- Không kết quả -->
      <div v-else-if="results.length === 0" class="text-gray-500">
        Không tìm thấy sản phẩm phù hợp.
      </div>

      <!-- Bộ lọc -->
      <div v-else class="flex justify-end mb-4 relative">
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
            class="w-full px-4 py-2 text-left hover:bg-gray-100"
            @click="filterByPrice('asc')"
          >
            Giá thấp → cao
          </button>
          <button
            class="w-full px-4 py-2 text-left hover:bg-gray-100"
            @click="filterByPrice('desc')"
          >
            Giá cao → thấp
          </button>
        </div>
      </div>

      <!-- Kết quả -->
      <div
        v-if="results.length"
        class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
      >
        <div
          v-for="item in results"
          :key="item.id"
          class="border rounded-lg shadow-sm hover:shadow-lg transition bg-white"
        >
          <NuxtLink :to="`/product/${item.id}`">
            <img
              :src="item.thumbnailUrl"
              :alt="item.name"
              class="w-full h-48 object-cover rounded-t-lg"
            />
          </NuxtLink>

          <div class="p-4">
            <NuxtLink :to="`/product/${item.id}`">
              <h3 class="font-semibold text-black mb-2 truncate">
                {{ item.name }}
              </h3>
            </NuxtLink>

            <p class="text-black font-medium">
              {{ formatPrice(item.price_default || item.price) }}
            </p>

            <NuxtLink
              :to="`/product/${item.id}`"
              class="mt-3 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 text-center block"
            >
              Xem chi tiết
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, watch } from "vue";
import { FunnelIcon } from "@heroicons/vue/24/outline";
const results = ref([]);
const loading = ref(false);
const showFilter = ref(false);

const route = useRoute();
const config = useRuntimeConfig();

function formatPrice(v) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(v) || 0);
}

async function fetchResults() {
  if (!route.query.name) return;
  loading.value = true;

  try {
    const res = await $fetch(
      `/product/search?name=${encodeURIComponent(route.query.name)}`,
      {
        baseURL: config.public.apiBase,
      }
    );
    results.value = res || [];
  } catch (err) {
    results.value = [];
  } finally {
    loading.value = false;
  }
}

// Bộ lọc giá
const filterByPrice = async (sort) => {
  showFilter.value = false;

  try {
    const res = await $fetch(`/product/products-by-price?sort=${sort}`, {
      baseURL: config.public.apiBase,
    });

    results.value = res.data || res;
  } catch (err) {
    console.error("Lỗi lọc sản phẩm:", err);
  }
};

watch(() => route.query.name, fetchResults, { immediate: true });
</script>

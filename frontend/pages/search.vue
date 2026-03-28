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
      <div v-else class="flex justify-end mb-4 relative" ref="filterDropdown">
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
        class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6"
      >
        <div
          v-for="item in paginatedResults"
          :key="item.id"
          class="border rounded-lg shadow-sm hover:shadow-lg transition"
        >
          <!-- Ảnh -->
          <NuxtLink :to="`/product/${item.id}`">
            <div class="w-full h-40 sm:h-56 bg-white rounded-t-lg overflow-hidden flex items-center justify-center">
              <img
                :src="item.thumbnailUrl"
                :alt="item.name"
                class="w-full h-full object-contain p-2"
              />
            </div>
          </NuxtLink>

          <!-- Nội dung -->
          <div class="p-4 flex flex-col justify-between bg-gray-100 rounded-b-lg">
            <NuxtLink :to="`/product/${item.id}`">
              <h3 class="font-semibold text-gray-800 mb-2 truncate">
                {{ item.name }}
              </h3>
            </NuxtLink>

            <p class="text-gray-600 font-medium">
              {{
                Number(item.price_default || item.price).toLocaleString(
                  "vi-VN",
                )
              }}
              đ
            </p>

            <!-- Nút xem chi tiết -->
            <NuxtLink
              :to="`/product/${item.id}`"
              class="mt-2 sm:mt-3 px-2 py-1.5 sm:px-4 sm:py-2 bg-black text-white rounded hover:bg-gray-800 text-center text-xs sm:text-sm transition-colors"
            >
              Xem chi tiết
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <Pagination
        v-if="!loading && totalPages > 1"
        :totalPages="totalPages"
        :currentPage="currentPage"
        :perPage="perPage"
        :total="results.length"
        @update:currentPage="(p) => (currentPage = p)"
      />
    </div>
  </div>
</template>
<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from "vue";
import { FunnelIcon } from "@heroicons/vue/24/outline";
import Pagination from "@/components/Pagination.vue";

const currentPage = ref(1);
const perPage = 12;
const results = ref([]);
const loading = ref(false);
const showFilter = ref(false);
const filterDropdown = ref(null);

const route = useRoute();
const config = useRuntimeConfig();

function formatPrice(v) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(v) || 0);
}

const totalPages = computed(() => Math.ceil(results.value.length / perPage));

const paginatedResults = computed(() => {
  const start = (currentPage.value - 1) * perPage;
  return results.value.slice(start, start + perPage);
});

async function fetchResults() {
  if (!route.query.name) return;
  loading.value = true;

  try {
    const res = await $fetch(
      `/product/search?name=${encodeURIComponent(route.query.name)}`,
      {
        baseURL: config.public.apiBase,
      },
    );
    results.value = res || [];
  } catch (err) {
    results.value = [];
  } finally {
    loading.value = false;
  }
}

// Đóng dropdown khi click bên ngoài
const handleClickOutside = (event) => {
  if (filterDropdown.value && !filterDropdown.value.contains(event.target)) {
    showFilter.value = false;
  }
};

// Bộ lọc giá: chỉ sắp xếp lại tập kết quả hiện có, không gọi API khác để tránh lẫn sản phẩm ngoài scope
const filterByPrice = (sort) => {
  showFilter.value = false;
  const sorted = [...results.value].sort((a, b) => {
    const pa = Number(a.price_default ?? a.price ?? 0);
    const pb = Number(b.price_default ?? b.price ?? 0);
    return sort === "asc" ? pa - pb : pb - pa;
  });
  results.value = sorted;
};

// Thêm/bỏ event listener cho click outside
onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});

watch(() => route.query.name, () => {
  currentPage.value = 1;
  fetchResults();
}, { immediate: true });
</script>

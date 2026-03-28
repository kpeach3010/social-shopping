<template>
  <div class="flex flex-col min-h-screen">
    <!-- Banner Slider -->
    <section class="relative w-full h-[200px] sm:h-[300px] md:h-[450px] overflow-hidden group mt-0 lg:-mt-1">
      <ClientOnly>
        <!-- Slides -->
        <div
          class="flex transition-transform duration-700 ease-in-out h-full w-full flex-nowrap gap-0"
          :style="{ transform: `translateX(-${currentSliderIndex * 100}%)` }"
        >
          <div
            v-for="(image, index) in sliderImages"
            :key="index"
            class="w-full h-full flex-shrink-0 flex-grow-0 basis-full bg-white flex items-center justify-center overflow-hidden"
          >
            <img
              :src="image"
              alt="Banner Slider"
              class="max-w-full max-h-full object-contain select-none"
              draggable="false"
            />
          </div>
        </div>

        <!-- Navigation Arrows -->
        <button
          v-if="sliderImages.length > 1"
          @click="prevSlide"
          class="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-white transition-all hover:bg-black/50 z-30 hidden sm:flex items-center justify-center shadow-lg"
          aria-label="Previous slide"
        >
          <ChevronLeftIcon class="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <button
          v-if="sliderImages.length > 1"
          @click="nextSlide"
          class="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-white transition-all hover:bg-black/50 z-30 hidden sm:flex items-center justify-center shadow-lg"
          aria-label="Next slide"
        >
          <ChevronRightIcon class="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <!-- Indicators (Dots) -->
        <div
          v-if="sliderImages.length > 1"
          class="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 flex gap-2 sm:gap-3 z-30"
        >
          <button
            v-for="(_, index) in sliderImages"
            :key="index"
            @click="goToSlide(index)"
            class="h-2 rounded-full transition-all duration-300 shadow-sm"
            :class="[
              currentSliderIndex === index
                ? 'w-8 bg-white shadow-[0_0_12px_rgba(255,255,255,1)]'
                : 'w-2 bg-white/60 hover:bg-white/90'
            ]"
            :aria-label="`Go to slide ${index + 1}`"
          ></button>
        </div>

        <!-- Empty State -->
        <div
          v-if="sliderImages.length === 0"
          class="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 italic"
        >
          Không tìm thấy ảnh slider
        </div>
      </ClientOnly>
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
    <section v-else class="container mx-auto px-4 pt-4 pb-10">
      <div class="text-center">
        <h2 class="text-xl sm:text-2xl font-bold mb-6 inline-block border-b-3 border-green-500 pb-1">TẤT CẢ SẢN PHẨM</h2>
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
        class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6"
      >
        <div
          v-for="product in paginatedProducts"
          :key="product.id"
          class="border rounded-lg shadow-sm hover:shadow-lg transition"
        >
          <!-- Ảnh -->
          <NuxtLink :to="`/product/${product.id}`">
            <div class="w-full h-40 sm:h-56 bg-white rounded-t-lg overflow-hidden flex items-center justify-center">
              <img
                :src="product.thumbnailUrl"
                :alt="product.name"
                class="w-full h-full object-contain p-2"
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
              class="mt-2 sm:mt-3 px-2 py-1.5 sm:px-4 sm:py-2 bg-black text-white rounded hover:bg-gray-800 text-center text-xs sm:text-sm transition-colors"
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
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/vue/24/outline";

// Slider Images from public/slider
const glob = import.meta.glob("/public/slider/*.{png,jpg,jpeg,webp,svg}", { eager: true });
const sliderImages = Object.keys(glob).map((path) => path.replace("/public", ""));

const currentSliderIndex = ref(0);
let sliderTimer = null;

const startSliderTimer = () => {
  if (sliderImages.length > 1) {
    stopSliderTimer();
    sliderTimer = setInterval(nextSlide, 5000);
  }
};

const stopSliderTimer = () => {
  if (sliderTimer) clearInterval(sliderTimer);
};

const nextSlide = () => {
  currentSliderIndex.value = (currentSliderIndex.value + 1) % sliderImages.length;
};

const prevSlide = () => {
  currentSliderIndex.value =
    currentSliderIndex.value === 0 ? sliderImages.length - 1 : currentSliderIndex.value - 1;
};

const goToSlide = (index) => {
  currentSliderIndex.value = index;
  startSliderTimer();
};

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
  startSliderTimer();
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
  stopSliderTimer();
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

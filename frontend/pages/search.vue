<template>
  <div>
    <Header />
    <div class="container mx-auto px-4 py-8 min-h-[60vh]">
      <h1 class="text-2xl font-bold mb-6">
        Kết quả tìm kiếm cho:
        <span class="text-black">"{{ $route.query.name }}"</span>
      </h1>
      <div v-if="loading" class="text-gray-500">Đang tìm kiếm...</div>
      <div v-else-if="results.length === 0" class="text-gray-500">
        Không tìm thấy sản phẩm phù hợp.
      </div>
      <div
        v-else
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
          <div class="p-4 flex flex-col justify-between">
            <NuxtLink :to="`/product/${item.id}`">
              <h3 class="font-semibold text-black mb-2 truncate">
                {{ item.name }}
              </h3>
            </NuxtLink>
            <p class="text-black font-medium">
              {{
                Number(item.price_default || item.price).toLocaleString("vi-VN")
              }}
              đ
            </p>
            <NuxtLink
              :to="`/product/${item.id}`"
              class="mt-3 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 text-center"
            >
              Xem chi tiết
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
    <Footer />
  </div>
</template>

<script setup>
import Header from "~/components/header.vue";
import Footer from "~/components/footer.vue";
import { ref, watch } from "vue";
const results = ref([]);
const loading = ref(false);
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

watch(() => route.query.name, fetchResults, { immediate: true });
</script>

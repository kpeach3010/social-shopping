<template>
  <div>
    <Header />

    <main class="container mx-auto px-6 py-10">
      <h2 class="text-xl font-bold mb-6">
        <template v-if="parentCategory"> {{ parentCategory.name }} > </template>
        {{ category?.name }}
      </h2>

      <!-- Loading -->
      <div v-if="loading" class="text-center text-gray-500">Đang tải...</div>

      <!-- Sản phẩm -->
      <div
        v-else-if="products.length"
        class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
      >
        <div
          v-for="p in products"
          :key="p.id"
          class="border rounded-lg shadow-sm hover:shadow-lg transition bg-white"
        >
          <!-- Ảnh -->
          <img
            :src="p.thumbnailUrl"
            :alt="p.name"
            class="w-full h-48 object-cover rounded-t-lg"
          />

          <!-- Nội dung -->
          <div class="p-4 flex flex-col justify-between">
            <h3 class="font-semibold text-gray-800 mb-2 truncate">
              {{ p.name }}
            </h3>
            <p class="text-gray-600">
              {{ formatPrice(p.price) }}
            </p>

            <!-- Nút -->
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
      <div v-else class="text-center text-gray-500">
        Không có sản phẩm nào trong danh mục này.
      </div>
    </main>

    <Footer />
  </div>
</template>
<script setup>
import Header from "@/components/header.vue";
import Footer from "@/components/footer.vue";

const route = useRoute();
const config = useRuntimeConfig();

const category = ref(null);
const parentCategory = ref(null);
const products = ref([]);
const loading = ref(true);

const formatPrice = (v) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(Number(v) || 0);

onMounted(async () => {
  try {
    // Lấy category hiện tại
    const res = await $fetch(`/category/category/${route.params.id}`, {
      baseURL: config.public.apiBase,
    });
    category.value = res;

    // Nếu có parentId → fetch thêm cha
    if (res.parentId) {
      const parent = await $fetch(`/category/category/${res.parentId}`, {
        baseURL: config.public.apiBase,
      });
      parentCategory.value = parent;
    }

    // Lấy sản phẩm trong category
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

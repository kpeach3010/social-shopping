<template>
  <div>
    <!-- Header -->
    <Header />

    <!-- Banner lớn -->
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

    <!-- Footer -->
    <Footer />
  </div>
</template>

<script setup>
// Import Header + Footer
import Header from "@/components/header.vue";
import Footer from "@/components/footer.vue";

const config = useRuntimeConfig();
const products = ref([]);

onMounted(async () => {
  try {
    const res = await $fetch("/product/all-products", {
      baseURL: config.public.apiBase,
    });
    console.log("Products API:", res);
    products.value = res;
  } catch (err) {
    console.error("Lỗi fetch products:", err);
  }
});
</script>

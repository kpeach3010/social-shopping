<template>
  <div v-if="open" class="fixed inset-0 flex items-center justify-center z-50">
    <!-- Overlay -->
    <div
      class="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
      @click="$emit('close')"
    ></div>

    <!-- Modal -->
    <div
      class="relative bg-white rounded-2xl shadow-2xl w-[480px] h-[600px] flex flex-col z-10 animate-fade-in"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-5 py-3 border-b border-gray-200"
      >
        <h2 class="text-lg font-semibold text-gray-800">
          Chọn sản phẩm áp dụng coupon
        </h2>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600 transition"
        >
          ✕
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        <div v-if="loading" class="text-center text-gray-500 py-10">
          Đang tải...
        </div>
        <div
          v-else-if="products.length === 0"
          class="text-center text-gray-500 py-10"
        >
          Không có sản phẩm nào áp dụng coupon này.
        </div>
        <div v-else>
          <div
            v-for="p in products"
            :key="p.id"
            class="flex items-center gap-4 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition"
          >
            <img
              :src="p.thumbnailUrl"
              alt="thumb"
              class="w-16 h-16 object-cover rounded shadow"
            />
            <div class="flex-1">
              <div class="font-semibold text-gray-800">{{ p.name }}</div>
              <div class="text-sm text-gray-500">
                Giá:
                <span class="font-medium text-gray-700">{{
                  formatPrice(p.price)
                }}</span>
              </div>
              <div class="text-xs text-gray-500">Kho: {{ p.stock }}</div>
            </div>
            <button
              @click="selectProduct(p)"
              class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded shadow"
            >
              Chọn
            </button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="px-5 py-3 border-t border-gray-200 flex justify-end gap-2 bg-white"
      >
        <button
          @click="$emit('close')"
          class="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium"
        >
          Đóng
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";

const props = defineProps({
  open: Boolean,
  couponId: String,
});
const emit = defineEmits(["close", "select"]);

const products = ref([]);
const loading = ref(false);

function formatPrice(v) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(v || 0);
}

async function fetchProducts() {
  if (!props.couponId) return;
  loading.value = true;
  try {
    const res = await $fetch(`/coupons/products-by-coupon/${props.couponId}`, {
      baseURL: useRuntimeConfig().public.apiBase,
    });
    products.value = res.data || [];
  } catch (err) {
    products.value = [];
  } finally {
    loading.value = false;
  }
}

function selectProduct(product) {
  emit("select", product);
}

watch(
  () => props.open,
  (val) => {
    if (val) fetchProducts();
  },
);

onMounted(() => {
  if (props.open) fetchProducts();
});
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.25s ease-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>

<template>
  <div class="relative w-full" ref="searchBoxRef">
    <input
      v-model="query"
      @input="onInput"
      @keydown.enter="goToSearchPage"
      type="text"
      placeholder="Tìm kiếm sản phẩm..."
      class="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500"
    />
    <div
      v-if="showDropdown && results.length"
      class="absolute left-0 right-0 mt-1 bg-white border border-black rounded-lg shadow z-50 max-h-96 overflow-y-auto"
    >
      <NuxtLink
        v-for="item in results"
        :key="item.id"
        :to="`/product/${item.id}`"
        class="flex flex-row items-center border border-black rounded-lg m-2 px-2 py-1 hover:bg-gray-100 transition cursor-pointer group min-w-0"
        style="text-decoration: none; min-height: 56px"
      >
        <img
          :src="item.thumbnailUrl"
          alt="Ảnh"
          class="w-12 h-12 object-cover rounded border border-gray-300 flex-shrink-0"
        />
        <div class="flex flex-col justify-center ml-3 min-w-0 flex-1">
          <div class="font-semibold text-black text-sm truncate">
            {{ item.name }}
          </div>
          <div class="text-gray-500 text-xs mt-0.5 truncate">
            {{ formatPrice(item.price) }}
          </div>
        </div>
      </NuxtLink>
      <div v-if="results.length >= 5" class="text-center py-2">
        <button
          @click="goToSearchPage"
          class="text-black hover:underline text-sm border border-black rounded px-3 py-1 bg-white"
        >
          Xem tất cả kết quả
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { useRuntimeConfig } from "#app";

const query = ref("");
const results = ref([]);
const showDropdown = ref(false);
const searchBoxRef = ref(null);
const router = useRouter();
const config = useRuntimeConfig();
let debounceTimeout = null;

function formatPrice(price) {
  if (typeof price === "number") {
    return price.toLocaleString("vi-VN", {
      style: "currency",
      currency: "VND",
    });
  }
  return price;
}

async function fetchResults() {
  if (!query.value.trim()) {
    results.value = [];
    showDropdown.value = false;
    return;
  }
  try {
    const res = await $fetch(
      `${config.public.apiBase}/product/search?name=${encodeURIComponent(
        query.value
      )}`
    );
    results.value = Array.isArray(res) ? res.slice(0, 5) : [];
    showDropdown.value = results.value.length > 0;
  } catch (e) {
    results.value = [];
    showDropdown.value = false;
  }
}

function onInput() {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(fetchResults, 300);
}

function goToSearchPage() {
  if (query.value.trim()) {
    router.push(`/search?name=${encodeURIComponent(query.value)}`);
    showDropdown.value = false;
  }
}

// Đóng dropdown khi click ngoài
function handleClickOutside(e) {
  if (searchBoxRef.value && !searchBoxRef.value.contains(e.target)) {
    showDropdown.value = false;
  }
}
onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});
onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

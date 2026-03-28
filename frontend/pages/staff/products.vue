<script setup>
import { ref, onMounted, computed, watch } from "vue";
import {
  Shirt,
  BadgePercent,
  ShoppingBag,
  BarChart,
  Trash2,
  PencilLine,
  Loader2,
  Search,
  X as CloseIcon,
} from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";

import AddProductModal from "@/components/modals/staff/AddProductModal.vue";
import EditProductModal from "@/components/modals/staff/EditProductModal.vue";
import Sidebar from "@/components/modals/staff/Sidebar.vue";
import Pagination from "@/components/Pagination.vue";

const showModal = ref(false);
const showEditModal = ref(false);
const editProductData = ref(null);
const editProductLoading = ref(false);
const editProductCategories = ref([]);
const isOpen = ref(true);
const products = ref([]);
const loading = ref(false);
const isBulkDeleting = ref(false);
const deletingProductIds = ref(new Set());
const auth = useAuthStore();
const config = useRuntimeConfig();
const searchKeyword = ref("");

// Hàm fetch chi tiết sản phẩm
const openEditModal = async (product) => {
  editProductLoading.value = true;
  try {
    const [detail, categories] = await Promise.all([
      $fetch(`/product/get-product/${product.id}`, {
        baseURL: config.public.apiBase,
      }),
      $fetch("/category/all-categories", {
        baseURL: config.public.apiBase,
      }),
    ]);
    const colorMap = {};
    detail.variants.forEach((v) => {
      const colorKey = v.color || "__NO_COLOR__";
      if (!colorMap[colorKey]) {
        colorMap[colorKey] = {
          id: v.colorId,
          colorName: v.color || "",
          imageUrl: v.imageUrl || null,
          preview: v.imageUrl || null,
          sizes: [],
        };
      }
      colorMap[colorKey].sizes.push({
        sizeName: v.size || "",
        price: v.price,
        stock: v.stock,
        variantId: v.id,
        id: v.id,
        sku: v.sku,
      });
    });
    const colors = Object.values(colorMap);
    editProductData.value = {
      ...detail,
      name: detail.name,
      price_default: detail.price_default || detail.price,
      description: detail.description,
      categoryId: detail.categoryId,
      thumbnailUrl: detail.thumbnailUrl,
      backThumbnailUrl: detail.backThumbnailUrl,
      colors,
    };
    editProductCategories.value = categories;
    showEditModal.value = true;
  } catch (err) {
    alert("Không lấy được chi tiết sản phẩm!");
    console.error(err);
  } finally {
    editProductLoading.value = false;
  }
};

const toggleSidebar = () => {
  isOpen.value = !isOpen.value;
};

const formatPrice = (v) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(Number(v) || 0);
};

const fetchProducts = async () => {
  loading.value = true;
  try {
    const data = await $fetch("/product/all-products", {
      baseURL: config.public.apiBase,
    });
    products.value = data;
  } catch (err) {
    console.error("Lỗi fetch products:", err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchProducts();
  if (window.innerWidth < 1024) {
    isOpen.value = false;
  }
});

const currentPage = ref(1);
const perPage = ref(8);

const filteredProducts = computed(() => {
  if (!searchKeyword.value.trim()) return products.value;
  const q = searchKeyword.value.toLowerCase();
  return products.value.filter((p) => p.name.toLowerCase().includes(q));
});

const totalPages = computed(() =>
  Math.ceil(filteredProducts.value.length / perPage.value),
);

const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * perPage.value;
  return filteredProducts.value.slice(start, start + perPage.value);
});

watch(searchKeyword, () => {
  currentPage.value = 1;
});

const selectedProductIds = ref([]);

const isAllCurrentPageSelected = computed(() => {
  const ids = paginatedProducts.value.map((p) => p.id);
  return (
    ids.length > 0 && ids.every((id) => selectedProductIds.value.includes(id))
  );
});

const toggleSelectAllCurrentPage = () => {
  const ids = paginatedProducts.value.map((p) => p.id);
  if (isAllCurrentPageSelected.value) {
    selectedProductIds.value = selectedProductIds.value.filter(
      (id) => !ids.includes(id),
    );
  } else {
    selectedProductIds.value = Array.from(
      new Set([...selectedProductIds.value, ...ids]),
    );
  }
};
const toggleSelectProduct = (id) => {
  if (selectedProductIds.value.includes(id)) {
    selectedProductIds.value = selectedProductIds.value.filter(
      (pid) => pid !== id,
    );
  } else {
    selectedProductIds.value.push(id);
  }
};

const deleteProducts = async (ids) => {
  let idArr = Array.isArray(ids) ? ids : [ids];
  if (!idArr.length) return;
  const confirmMsg =
    idArr.length === 1
      ? "Bạn có chắc muốn xóa sản phẩm này?"
      : `Bạn có chắc muốn xóa ${idArr.length} sản phẩm đã chọn?`;
  if (!confirm(confirmMsg)) return;

  if (idArr.length === 1) {
    deletingProductIds.value.add(idArr[0]);
  } else {
    isBulkDeleting.value = true;
  }

  try {
    await $fetch(`/product/delete-many/${idArr.join(",")}`, {
      method: "DELETE",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    if (idArr.length === 1) {
      selectedProductIds.value = selectedProductIds.value.filter(
        (pid) => pid !== idArr[0],
      );
    } else {
      selectedProductIds.value = [];
    }
    await fetchProducts();
    alert("Đã xóa sản phẩm thành công!");
  } catch (err) {
    const errorMsg = err?.response?._data?.error || "Lỗi xóa sản phẩm!";
    alert(errorMsg);
    console.error(err);
  } finally {
    if (idArr.length === 1) {
      deletingProductIds.value.delete(idArr[0]);
    } else {
      isBulkDeleting.value = false;
    }
  }
};
</script>

<template>
  <div class="flex min-h-screen bg-gray-50">
    <Sidebar :isOpen="isOpen" @toggle="toggleSidebar" />

    <div class="flex-1 flex flex-col min-w-0">
      <main class="flex-1 p-4 md:p-6 overflow-hidden">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div class="flex items-center gap-3">
            <button
              @click="toggleSidebar"
              class="lg:hidden p-2 -ml-2 rounded-md hover:bg-gray-200 text-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 class="text-xl md:text-2xl font-bold">Quản lý sản phẩm</h1>
          </div>
          <div class="flex gap-2">
            <button
              v-if="selectedProductIds.length > 0"
              @click="deleteProducts(selectedProductIds)"
              :disabled="isBulkDeleting"
              class="px-3 py-1.5 md:px-4 md:py-2 bg-red-600 text-white rounded hover:bg-red-500 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 text-sm md:text-base"
            >
              <Loader2 v-if="isBulkDeleting" class="w-4 h-4 animate-spin" />
              <span>Xóa ({{ selectedProductIds.length }})</span>
            </button>

            <button
              @click="showModal = true"
              class="w-full md:w-auto px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition text-sm md:text-base"
            >
              + Thêm sản phẩm
            </button>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="mb-6 relative max-w-md group">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search class="h-5 w-5 text-gray-400 group-focus-within:text-black transition-colors" />
          </div>
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="Tìm kiếm sản phẩm theo tên..."
            class="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-black transition-all text-sm"
          />
          <button
            v-if="searchKeyword"
            @click="searchKeyword = ''"
            class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-red-500 transition-colors"
          >
            <CloseIcon class="h-5 w-5" />
          </button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="text-center py-6 text-gray-500">
          Đang tải...
        </div>

        <!-- Bảng sản phẩm -->
        <div
          v-else
          class="overflow-x-auto bg-white rounded-lg shadow transition"
        >
          <table
            class="min-w-full text-sm text-left text-gray-600 border-collapse"
          >
            <thead class="bg-gray-300 text-gray-800 font-semibold">
              <tr>
                <th class="px-2 py-3 w-8 text-center">
                  <input
                    type="checkbox"
                    :checked="isAllCurrentPageSelected"
                    @change="toggleSelectAllCurrentPage"
                  />
                </th>
                <th class="px-4 py-3">Ảnh</th>
                <th class="px-4 py-3">Tên sản phẩm</th>
                <th class="px-4 py-3">Giá</th>
                <th class="px-4 py-3">Kho</th>
                <th class="px-4 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in paginatedProducts"
                :key="p.id"
                class="odd:bg-gray-100 even:bg-white border-b hover:bg-gray-200 transition-colors"
              >
                <td class="px-2 py-3 w-8 text-center">
                  <input
                    type="checkbox"
                    :checked="selectedProductIds.includes(p.id)"
                    @change="toggleSelectProduct(p.id)"
                  />
                </td>
                <td class="px-4 py-3">
                  <img
                    :src="p.thumbnailUrl"
                    class="w-12 h-12 rounded object-cover border"
                  />
                </td>
                <td class="px-4 py-3 font-medium text-gray-800">
                  {{ p.name }}
                </td>
                <td class="px-4 py-3 text-gray-700">
                  {{ formatPrice(p.price) }}
                </td>
                <td class="px-4 py-3 text-gray-700">{{ p.stock }}</td>
                <td class="px-4 py-3">
                  <div class="flex justify-end gap-2">
                    <button
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-blue-500 text-blue-600 hover:bg-blue-50 transition"
                      @click="openEditModal(p)"
                    >
                      <PencilLine class="w-4 h-4" />
                      <span class="text-sm">Sửa</span>
                    </button>
                    <button
                      v-if="selectedProductIds.length === 0"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-600 bg-red-600 text-white hover:bg-red-500 transition disabled:opacity-70 disabled:cursor-not-allowed"
                      @click="deleteProducts(p.id)"
                      :disabled="deletingProductIds.has(p.id)"
                    >
                      <Loader2
                        v-if="deletingProductIds.has(p.id)"
                        class="w-4 h-4 animate-spin"
                      />
                      <Trash2 v-else class="w-4 h-4" />
                      <span class="text-sm">Xóa</span>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredProducts.length === 0">
                <td colspan="6" class="text-center py-6 text-gray-500">
                  Không tìm thấy sản phẩm phù hợp
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <Pagination
          v-if="totalPages > 1"
          :totalPages="totalPages"
          :currentPage="currentPage"
          :total="filteredProducts.length"
          :perPage="perPage"
          @update:currentPage="(p) => (currentPage = p)"
        />

        <AddProductModal
          v-if="showModal"
          @close="showModal = false"
          @refresh="fetchProducts"
        />
        <EditProductModal
          v-if="showEditModal"
          :show="showEditModal"
          :productData="editProductData"
          :categories="editProductCategories"
          @close="showEditModal = false"
          @refresh="fetchProducts"
        />

        <div
          v-if="editProductLoading"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
        >
          <div class="bg-white px-6 py-4 rounded shadow text-lg">
            Đang tải chi tiết sản phẩm...
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

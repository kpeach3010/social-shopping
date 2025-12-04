<script setup>
import { ref, onMounted, computed } from "vue";
import {
  Shirt,
  BadgePercent,
  ShoppingBag,
  BarChart,
  Trash2,
  PencilLine,
} from "lucide-vue-next";

import AddProductModal from "@/components/modals/staff/AddProductModal.vue";
import EditProductModal from "@/components/modals/staff/EditProductModal.vue";
import Sidebar from "@/components/modals/staff/Sidebar.vue";
import AddCategoryModal from "@/components/modals/staff/AddCategoryModal.vue";

const showModal = ref(false);
const showEditModal = ref(false);
const editProductData = ref(null);
const editProductLoading = ref(false);
const editProductCategories = ref([]);
const isOpen = ref(true);
const products = ref([]);
const loading = ref(false);
const auth = useAuthStore();
const showCategoryModal = ref(false);
const config = useRuntimeConfig();

// Hàm fetch chi tiết sản phẩm (bao gồm màu, size, tồn kho...) và danh mục
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
    // Chuyển variants về cấu trúc colors -> sizes
    const colorMap = {};
    detail.variants.forEach((v) => {
      const colorKey = v.color || "__NO_COLOR__";
      if (!colorMap[colorKey]) {
        const colorObj = (detail.colors || []).find((c) => c.name === v.color);
        colorMap[colorKey] = {
          id: colorObj ? colorObj.id : undefined,
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

definePageMeta({
  middleware: "staff",
});

const toggleSidebar = () => {
  isOpen.value = !isOpen.value;
};

const formatPrice = (v) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(Number(v) || 0);
};

// Hàm fetch chung
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

onMounted(fetchProducts);
const currentPage = ref(1);
const perPage = ref(8); // số sp / trang

const totalPages = computed(() =>
  Math.ceil(products.value.length / perPage.value)
);

const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * perPage.value;
  return products.value.slice(start, start + perPage.value);
});

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

const selectedProductIds = ref([]);

// Chọn tất cả sản phẩm trên trang hiện tại
const isAllCurrentPageSelected = computed(() => {
  const ids = paginatedProducts.value.map((p) => p.id);
  return (
    ids.length > 0 && ids.every((id) => selectedProductIds.value.includes(id))
  );
});

const toggleSelectAllCurrentPage = () => {
  const ids = paginatedProducts.value.map((p) => p.id);
  if (isAllCurrentPageSelected.value) {
    // Bỏ chọn tất cả trên trang hiện tại
    selectedProductIds.value = selectedProductIds.value.filter(
      (id) => !ids.includes(id)
    );
  } else {
    // Chọn tất cả trên trang hiện tại
    selectedProductIds.value = Array.from(
      new Set([...selectedProductIds.value, ...ids])
    );
  }
};
const toggleSelectProduct = (id) => {
  if (selectedProductIds.value.includes(id)) {
    selectedProductIds.value = selectedProductIds.value.filter(
      (pid) => pid !== id
    );
  } else {
    selectedProductIds.value.push(id);
  }
};

// Hàm xóa sản phẩm (1 hoặc nhiều)
const deleteProducts = async (ids) => {
  // ids: string | string[]
  let idArr = Array.isArray(ids) ? ids : [ids];
  if (!idArr.length) return;
  const confirmMsg =
    idArr.length === 1
      ? "Bạn có chắc muốn xóa sản phẩm này?"
      : `Bạn có chắc muốn xóa ${idArr.length} sản phẩm đã chọn?`;
  if (!confirm(confirmMsg)) return;
  try {
    await $fetch(`/product/delete-many/${idArr.join(",")}`, {
      method: "DELETE",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    // Nếu xóa nhiều thì clear hết, xóa 1 thì loại id đó khỏi selectedProductIds
    if (idArr.length === 1) {
      selectedProductIds.value = selectedProductIds.value.filter(
        (pid) => pid !== idArr[0]
      );
    } else {
      selectedProductIds.value = [];
    }
    await fetchProducts();
    alert("Đã xóa sản phẩm thành công!");
  } catch (err) {
    alert("Lỗi xóa sản phẩm!");
    console.error(err);
  }
};
</script>

<template>
  <div class="flex min-h-screen bg-gray-50">
    <!-- Sidebar -->
    <Sidebar :isOpen="isOpen" @toggle="toggleSidebar" />

    <!-- Main -->
    <div class="flex-1 flex flex-col">
      <main class="flex-1 p-6">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold">Quản lý sản phẩm</h1>
          <div class="flex gap-2">
            <button
              v-if="selectedProductIds.length > 0"
              @click="deleteProducts(selectedProductIds)"
              class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500"
            >
              Xóa đã chọn ({{ selectedProductIds.length }})
            </button>

            <!-- Nút thêm danh mục -->
            <button
              @click="showCategoryModal = true"
              class="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
            >
              + Thêm danh mục
            </button>

            <!-- Nút thêm sản phẩm -->
            <button
              @click="showModal = true"
              class="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
            >
              + Thêm sản phẩm
            </button>
          </div>
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
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-blue-500 text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition"
                      @click="openEditModal(p)"
                    >
                      <PencilLine class="w-4 h-4" />
                      <span class="text-sm">Sửa</span>
                    </button>
                    <button
                      v-if="selectedProductIds.length === 0"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-600 bg-red-600 text-white hover:bg-red-500 active:bg-red-700 transition"
                      @click="deleteProducts(p.id)"
                    >
                      <Trash2 class="w-4 h-4" />
                      <span class="text-sm">Xóa</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex justify-center mt-6 gap-2">
          <button
            @click="changePage(currentPage - 1)"
            :disabled="currentPage === 1"
            class="px-3 py-1 border rounded disabled:opacity-50"
          >
            ‹
          </button>
          <button
            v-for="page in totalPages"
            :key="page"
            @click="changePage(page)"
            class="px-3 py-1 border rounded"
            :class="
              currentPage === page ? 'bg-black text-white' : 'hover:bg-gray-100'
            "
          >
            {{ page }}
          </button>
          <button
            @click="changePage(currentPage + 1)"
            :disabled="currentPage === totalPages"
            class="px-3 py-1 border rounded disabled:opacity-50"
          >
            ›
          </button>
        </div>
        <!-- Modal thêm sản phẩm -->
        <AddProductModal
          v-if="showModal"
          @close="showModal = false"
          @refresh="fetchProducts"
        />
        <!-- Modal sửa sản phẩm -->
        <EditProductModal
          v-if="showEditModal"
          :show="showEditModal"
          :productData="editProductData"
          :categories="editProductCategories"
          @close="showEditModal = false"
          @refresh="fetchProducts"
        />
        <AddCategoryModal
          v-if="showCategoryModal"
          @close="showCategoryModal = false"
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

<script setup>
import { ref, onMounted, computed } from "vue";
import { Folder, Trash2, PencilLine, LayoutList } from "lucide-vue-next";

// Import components và store
import Sidebar from "@/components/modals/staff/Sidebar.vue";
import AddCategoryModal from "@/components/modals/staff/AddCategoryModal.vue";
import EditCategoryModal from "@/components/modals/staff/EditCategoryModal.vue";
import CategoryTreeItem from "@/components/modals/staff/CategoryTreeItem.vue";
import { useAuthStore } from "@/stores/auth";

const showAddModal = ref(false);
const showEditModal = ref(false);
const editCategoryData = ref(null);
const isOpen = ref(true);
const categories = ref([]); // Dữ liệu phẳng từ API
const loading = ref(false);
const auth = useAuthStore();
const expandedCategories = ref({});

definePageMeta({
  middleware: "staff",
});

const toggleSidebar = () => {
  isOpen.value = !isOpen.value;
};

// --- LOGIC QUAN TRỌNG: TÍNH TỔNG CỘNG DỒN ---

/**
 * Hàm đệ quy xây dựng cây và tính tổng sản phẩm tích lũy
 */
const buildCategoryTree = (list, parentId = null) => {
  // 1. Lấy danh sách con trực tiếp
  let children = list.filter((item) => item.parentId === parentId);

  // 2. Map qua từng phần tử con để xử lý đệ quy
  children = children.map((category) => {
    // Gọi đệ quy để lấy cây con của danh mục hiện tại
    const nestedChildren = buildCategoryTree(list, category.id);

    // Lấy số lượng sản phẩm trực tiếp của danh mục này (từ API)
    // Nếu API trả về null/undefined thì tính là 0
    const directCount = Number(category.productCount) || 0;

    // Tính tổng số lượng từ các danh mục con (đã được tính toán ở bước đệ quy trước)
    const childrenTotal = nestedChildren.reduce(
      (sum, child) => sum + (child.totalProductCount || 0),
      0
    );

    // Tổng cuối cùng = Trực tiếp + Tổng con
    const totalProductCount = directCount + childrenTotal;

    return {
      ...category,
      children: nestedChildren, // Gán cây con đã xử lý
      totalProductCount: totalProductCount, // Trường mới dùng để hiển thị
    };
  });

  // 3. Sắp xếp theo sort order trước khi trả về
  return children.sort((a, b) => (a.sort || 0) - (b.sort || 0));
};

// Computed property để tự động tính toán lại khi data thay đổi
const categoryTree = computed(() => {
  if (!categories.value || categories.value.length === 0) return [];
  return buildCategoryTree(categories.value);
});

// --- FETCH DATA ---
const fetchCategories = async () => {
  loading.value = true;
  try {
    // API này cần trả về field 'productCount' cho từng category
    const data = await $fetch(
      "http://localhost:5000/api/category/all-categories"
    );
    categories.value = data;
  } catch (err) {
    alert("Lỗi tải danh mục!");
    console.error(err);
  } finally {
    loading.value = false;
  }
};

onMounted(fetchCategories);

// --- CRUD ---
const openEditModal = (category) => {
  editCategoryData.value = { ...category };
  showEditModal.value = true;
};

const deleteCategory = async (id, name) => {
  if (!confirm(`Bạn có chắc muốn xóa danh mục: "${name}" không?`)) return;
  try {
    const res = await $fetch(
      `http://localhost:5000/api/category/delete-category/${id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      }
    );
    await fetchCategories();
    alert(res.message || "Xóa thành công");
  } catch (err) {
    const errorMsg = err?.response?._data?.error || "Lỗi xóa danh mục!";
    alert(errorMsg);
  }
};

// --- EXPAND/COLLAPSE ---
const toggleExpand = (categoryId) => {
  expandedCategories.value = {
    ...expandedCategories.value,
    [categoryId]: !expandedCategories.value[categoryId],
  };
};

const isExpanded = (categoryId) => {
  return !!expandedCategories.value[categoryId];
};
</script>

<template>
  <div class="flex min-h-screen bg-gray-50">
    <Sidebar :isOpen="isOpen" @toggle="toggleSidebar" />
    <div class="flex-1 flex flex-col">
      <main class="flex-1 p-6">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold flex items-center gap-2">
            <LayoutList class="w-6 h-6 text-gray-700" /> Quản lý Danh mục
          </h1>
          <button
            @click="showAddModal = true"
            class="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition"
          >
            + Thêm Danh mục
          </button>
        </div>

        <div v-if="loading" class="text-center py-10 text-gray-500">
          Đang tải...
        </div>

        <div
          v-else-if="categoryTree.length > 0"
          class="bg-white rounded-lg shadow overflow-hidden"
        >
          <div
            class="flex bg-gray-200 text-gray-700 font-semibold p-3 text-sm uppercase tracking-wider"
          >
            <div class="w-1/2 pl-4">Tên Danh mục</div>
            <div class="w-1/4 text-center">Thứ tự</div>
            <div class="w-1/4 text-right pr-4">Hành động</div>
          </div>

          <div class="divide-y divide-gray-100">
            <CategoryTreeItem
              v-for="cat in categoryTree"
              :key="cat.id"
              :category="cat"
              :level="0"
              :is-expanded="isExpanded(cat.id)"
              @toggle="toggleExpand"
              @edit="openEditModal"
              @delete="deleteCategory"
            />
          </div>
        </div>

        <div
          v-else
          class="text-center py-10 border-2 border-dashed border-gray-300 rounded-lg mt-6 text-gray-500"
        >
          Chưa có danh mục nào.
        </div>

        <AddCategoryModal
          v-if="showAddModal"
          @close="showAddModal = false"
          @refresh="fetchCategories"
          :categories="categories"
        />

        <EditCategoryModal
          v-if="showEditModal"
          :category-data="editCategoryData"
          :all-categories="categories"
          @close="showEditModal = false"
          @refresh="fetchCategories"
        />
      </main>
    </div>
  </div>
</template>

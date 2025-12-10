<template>
  <div v-if="open" class="fixed inset-0 flex items-center justify-center z-50">
    <div
      class="absolute inset-0 bg-black/30 backdrop-blur-sm"
      @click="emit('close')"
    ></div>

    <div
      class="relative bg-white rounded-xl shadow-xl w-[700px] max-h-[90vh] overflow-y-auto z-10"
    >
      <div
        class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-20"
      >
        <div class="flex flex-col">
          <h2 class="text-xl font-bold">Chỉnh sửa mã giảm giá</h2>
          <span class="text-xs text-gray-500">Mã: {{ coupon.code }}</span>
        </div>
        <button @click="emit('close')" class="text-gray-600 hover:text-black">
          <X class="w-6 h-6" />
        </button>
      </div>

      <div class="p-6 pt-4 space-y-5">
        <div class="space-y-1">
          <label class="font-medium">Mã giảm giá</label>
          <input
            v-model="coupon.code"
            type="text"
            disabled
            class="w-full border px-3 py-2 rounded bg-gray-100 text-gray-500 cursor-not-allowed"
          />
        </div>

        <div class="space-y-1">
          <label class="font-medium">Mô tả</label>
          <textarea
            v-model="coupon.description"
            class="w-full border px-3 py-2 rounded"
            placeholder="Mô tả ngắn..."
          ></textarea>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="font-medium">Hình thức áp dụng</label>
            <select
              v-model="coupon.kind"
              class="w-full border px-3 py-2 rounded"
            >
              <option value="general">Mã cá nhân</option>
              <option value="group">Mã nhóm</option>
            </select>
          </div>

          <div class="space-y-1">
            <label class="font-medium">Loại giảm</label>
            <select
              v-model="coupon.type"
              class="w-full border px-3 py-2 rounded"
            >
              <option value="fixed">Giảm tiền cố định</option>
              <option value="percent">Phần trăm (%)</option>
            </select>
          </div>
        </div>

        <div class="space-y-1">
          <label class="font-medium">
            Giá trị giảm ({{ coupon.type === "percent" ? "%" : "VNĐ" }})
          </label>
          <input
            v-model="coupon.value"
            type="number"
            class="w-full border px-3 py-2 rounded"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="font-medium">Ngày bắt đầu</label>
            <input
              v-model="coupon.startsAt"
              type="date"
              class="w-full border px-3 py-2 rounded"
            />
          </div>

          <div class="space-y-1">
            <label class="font-medium">Ngày kết thúc</label>
            <input
              v-model="coupon.endsAt"
              type="date"
              class="w-full border px-3 py-2 rounded"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="font-medium">Số lượng mã giảm giá</label>
            <input
              v-model="coupon.usage_limit"
              type="number"
              class="w-full border px-3 py-2 rounded"
            />
          </div>

          <div class="space-y-1">
            <label class="font-medium">Giới hạn lượt sử dụng mỗi người</label>
            <input
              v-model="coupon.perUserLimit"
              type="number"
              class="w-full border px-3 py-2 rounded"
            />
          </div>
        </div>

        <div class="space-y-1">
          <label class="font-medium">Giá trị đơn tối thiểu</label>
          <input
            v-model="coupon.minOrderTotal"
            type="number"
            class="w-full border px-3 py-2 rounded"
          />
        </div>

        <template v-if="coupon.kind === 'group'">
          <div class="space-y-1">
            <label class="font-medium text-blue-600"
              >Số thành viên yêu cầu khi sử dụng mã nhóm *</label
            >
            <input
              v-model="coupon.maxMember"
              type="number"
              class="w-full border border-blue-300 bg-blue-50 px-3 py-2 rounded"
            />
          </div>
        </template>

        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <label class="font-medium">Áp dụng cho sản phẩm</label>
            <span class="text-xs bg-black text-white px-2 py-1 rounded-full"
              >Đã chọn: {{ coupon.productIds.length }}</span
            >
          </div>

          <div
            class="border rounded p-3 max-h-64 overflow-y-auto space-y-2 bg-gray-50 custom-scrollbar"
          >
            <div
              v-if="isLoadingProducts"
              class="text-center text-sm text-gray-500 py-4"
            >
              Đang tải danh sách sản phẩm...
            </div>

            <label
              v-else
              v-for="p in products"
              :key="p.id"
              class="flex gap-3 items-center border-b pb-2 cursor-pointer hover:bg-gray-100 p-2 rounded transition"
              :class="{
                'bg-blue-50 border-blue-200': coupon.productIds.includes(p.id),
              }"
            >
              <input
                type="checkbox"
                :value="p.id"
                :checked="coupon.productIds.includes(p.id)"
                @change="toggleProduct(p.id)"
                class="w-5 h-5 accent-black"
              />

              <img
                :src="p.thumbnailUrl || 'https://placehold.co/50'"
                class="w-12 h-12 object-cover rounded border bg-white"
              />

              <div class="flex flex-col flex-1">
                <span
                  class="font-semibold text-sm"
                  :class="
                    coupon.productIds.includes(p.id)
                      ? 'text-blue-700'
                      : 'text-gray-900'
                  "
                >
                  {{ p.name }}
                </span>
                <span class="text-xs text-gray-500">
                  {{ new Intl.NumberFormat("vi-VN").format(p.price) }}₫
                </span>
              </div>
            </label>
          </div>
          <p class="text-xs text-gray-500 italic">
            * Không chọn sản phẩm nào đồng nghĩa áp dụng cho tất cả.
          </p>
        </div>

        <button
          class="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-70 disabled:cursor-not-allowed"
          @click="updateCoupon"
          :disabled="isLoading"
        >
          {{ isLoading ? "Đang lưu..." : "Lưu thay đổi" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { X } from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";

const props = defineProps({
  open: Boolean,
  couponData: Object, // Dữ liệu coupon cần sửa
});

const emit = defineEmits(["close", "refresh"]);

const auth = useAuthStore();
const config = useRuntimeConfig();

const isLoading = ref(false);
const isLoadingProducts = ref(false);
const products = ref([]); // Danh sách tất cả sản phẩm

const coupon = ref({
  code: "",
  description: "",
  kind: "general",
  type: "fixed",
  value: 0,
  startsAt: "",
  endsAt: "",
  usage_limit: 1,
  perUserLimit: 1,
  minOrderTotal: 0,
  maxMember: 2,
  productIds: [], // Chứa ID các sản phẩm đã chọn
});

// 1. Lấy danh sách tất cả sản phẩm
const fetchProducts = async () => {
  isLoadingProducts.value = true;
  try {
    const res = await $fetch("/product/all-products", {
      baseURL: config.public.apiBase,
    });
    products.value = res;
  } catch (err) {
    console.error("Lỗi tải sản phẩm:", err);
  } finally {
    isLoadingProducts.value = false;
  }
};

// 2. Logic Toggle (Giữ nguyên như Create)
const toggleProduct = (id) => {
  const arr = coupon.value.productIds;
  if (arr.includes(id)) {
    coupon.value.productIds = arr.filter((x) => x !== id); // Bỏ chọn
  } else {
    coupon.value.productIds.push(id); // Chọn
  }
};

// 3. WATCHER: Đổ dữ liệu coupon vào Form khi mở modal
watch(
  () => props.couponData,
  async (val) => {
    if (!val || !val.id) return;

    // BƯỚC 1: Hiển thị trước những thông tin cơ bản có sẵn (từ props) để UI không bị trống
    // Lưu ý: Lúc này chưa có products, nên checkbox chưa hiện
    coupon.value = {
      code: val.code || "",
      description: val.description || "",
      kind: val.kind || "general",
      type: val.type || "fixed",
      value: val.value || 0,
      startsAt: val.startsAt ? val.startsAt.substring(0, 10) : "",
      endsAt: val.endsAt ? val.endsAt.substring(0, 10) : "",
      usage_limit: val.usage_limit || 0,
      perUserLimit: val.perUserLimit || 0,
      minOrderTotal: val.minOrderTotal || 0,
      maxMember: val.maxMember || 2,
      productIds: [], // Tạm thời để rỗng
    };

    // BƯỚC 2: Gọi API lấy chi tiết Coupon (để lấy danh sách products)
    try {
      // Dùng endpoint như trong ảnh Postman của bạn: /coupons/{id}
      // Giả sử baseURL đã cấu hình là /api
      const res = await $fetch(`/coupons/${val.id}`, {
        baseURL: config.public.apiBase,
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });

      console.log("Dữ liệu chi tiết FULL từ API:", res);

      // Xử lý dữ liệu trả về (hỗ trợ cả trường hợp có bọc 'data' hoặc không)
      const fullData = res.data || res;

      // BƯỚC 3: Cập nhật lại danh sách sản phẩm vào form
      if (fullData.products && Array.isArray(fullData.products)) {
        // Map ra mảng ID để checkbox tự động tick
        coupon.value.productIds = fullData.products.map((p) => p.id);

        console.log("Đã cập nhật productIds:", coupon.value.productIds);
      }
    } catch (err) {
      console.error("Không thể lấy chi tiết coupon:", err);
    }
  },
  { immediate: true, deep: true }
);

// 4. API Update
const updateCoupon = async () => {
  if (isLoading.value) return;
  isLoading.value = true;
  try {
    await $fetch(`/coupons/update-coupon/${props.couponData.id}`, {
      method: "PATCH",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      body: coupon.value,
    });

    alert("Cập nhật thành công!");
    emit("refresh");
    emit("close");
  } catch (err) {
    console.error(err);
    alert(err.data?.message || "Không thể cập nhật mã giảm giá!");
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchProducts();
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 20px;
}
</style>

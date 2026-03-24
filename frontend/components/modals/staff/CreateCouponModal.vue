<template>
  <div class="fixed inset-0 flex items-center justify-center z-50">
    <!-- Overlay -->
    <div
      class="absolute inset-0 bg-black/30 backdrop-blur-sm"
      @click="emit('close')"
    ></div>

    <!-- Modal -->
    <div
      class="relative bg-white rounded-xl shadow-xl w-[700px] max-h-[90vh] overflow-y-auto z-10"
    >
      <!-- Header -->
      <div
        class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-20"
      >
        <h2 class="text-xl font-bold">Tạo mã giảm giá</h2>
        <button @click="emit('close')" class="text-gray-600 hover:text-black">
          <X class="w-6 h-6" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 pt-4 space-y-5">
        <!-- Code -->
        <div class="space-y-1">
          <label class="font-medium">Mã giảm giá</label>
          <input
            v-model="coupon.code"
            type="text"
            class="w-full border px-3 py-2 rounded"
            placeholder="VD: SALE10"
          />
        </div>

        <!-- Description -->
        <div class="space-y-1">
          <label class="font-medium">Mô tả</label>
          <textarea
            v-model="coupon.description"
            class="w-full border px-3 py-2 rounded"
            placeholder="Mô tả ngắn..."
          ></textarea>
        </div>

        <!-- Kind + Type -->
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

        <!-- Value -->
        <div class="space-y-1">
          <label class="font-medium">
            Giá trị giảm ({{ coupon.type === "percent" ? "%" : "VNĐ" }})
          </label>
          <input
            v-model="coupon.value"
            type="number"
            class="w-full border px-3 py-2 rounded"
            placeholder="VD: 10"
            :max="coupon.type === 'percent' ? 99 : undefined"
            @input="onDiscountInput"
          />
          <div v-if="discountError" class="text-red-600 text-xs mt-1">
            {{ discountError }}
          </div>
        </div>

        <!-- Date -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="font-medium">Ngày bắt đầu</label>
            <input
              v-model="coupon.startsAt"
              type="datetime-local"
              class="w-full border px-3 py-2 rounded"
            />
          </div>

          <div class="space-y-1">
            <label class="font-medium">Ngày kết thúc</label>
            <input
              v-model="coupon.endsAt"
              type="datetime-local"
              class="w-full border px-3 py-2 rounded"
            />
          </div>
        </div>

        <!-- Limits -->
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

        <!-- Min Order -->
        <div class="space-y-1">
          <label class="font-medium">Giá trị đơn tối thiểu</label>
          <input
            v-model="coupon.minOrderTotal"
            type="number"
            class="w-full border px-3 py-2 rounded"
          />
        </div>

        <!-- GROUP-ONLY FIELDS -->
        <template v-if="coupon.kind === 'group'">
          <!-- Max Member -->
          <div class="space-y-1">
            <label class="font-medium"
              >Số thành viên yêu cầu khi sử dụng mã nhóm *</label
            >
            <input
              v-model="coupon.maxMember"
              type="number"
              class="w-full border px-3 py-2 rounded"
            />
          </div>
        </template>

        <!-- Product List -->
        <div class="space-y-2">
          <label class="font-medium">Áp dụng cho sản phẩm</label>
          <p class="text-xs text-red-500 italic">
            * Không chọn sản phẩm nào đồng nghĩa áp dụng cho tất cả.
          </p>
          <div
            class="border rounded p-3 max-h-64 overflow-y-auto space-y-2 bg-gray-50"
          >
            <label
              v-for="p in products"
              :key="p.id"
              class="flex gap-3 items-center border-b pb-2 cursor-pointer"
            >
              <input
                type="checkbox"
                :value="p.id"
                :checked="coupon.productIds.includes(p.id)"
                @change="toggleProduct(p.id)"
              />
              <img
                :src="p.thumbnailUrl"
                class="w-12 h-12 object-cover rounded border"
              />
              <div class="flex flex-col">
                <span class="font-semibold">{{ p.name }}</span>
                <span class="text-xs text-gray-500">
                  {{ new Intl.NumberFormat("vi-VN").format(p.price) }}₫
                </span>
              </div>
            </label>
          </div>
        </div>

        <!-- Button -->
        <button
          class="w-full bg-black text-white py-2 rounded-lg transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          :class="
            !isFormValid || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800'
          "
          :disabled="!isFormValid || isLoading"
          @click="createCoupon"
        >
          <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin" />
          <span>{{ isLoading ? "Đang xử lý..." : "Tạo mã giảm giá" }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { X, Loader2 } from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";
const emit = defineEmits(["close", "refresh"]);

const auth = useAuthStore();
const config = useRuntimeConfig();
const isLoading = ref(false);

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
  productIds: [],
});

const products = ref([]);

const fetchProducts = async () => {
  const res = await $fetch("/product/all-products", {
    baseURL: config.public.apiBase,
  });
  products.value = res;
};

const toggleProduct = (id) => {
  const arr = coupon.value.productIds;
  if (arr.includes(id)) {
    coupon.value.productIds = arr.filter((x) => x !== id);
  } else {
    coupon.value.productIds.push(id);
  }
};

// Trạng thái lỗi nhập giá trị giảm
const discountError = ref("");
const onDiscountInput = (e) => {
  if (coupon.value.type === "percent") {
    let val = String(e.target.value);
    if (val.length > 2) {
      discountError.value = "Chỉ được nhập giá trị có 2 chữ số cho loại giảm %";
      // Cắt bớt chỉ lấy 2 chữ số đầu
      const truncated = val.slice(0, 2);
      coupon.value.value = Number(truncated);
      e.target.value = truncated;
    } else {
      discountError.value = "";
      // Đảm bảo giá trị không âm và không vượt quá 99
      let num = Number(val);
      if (num < 0) coupon.value.value = 0;
      if (num > 99) coupon.value.value = 99;
    }
  } else {
    discountError.value = "";
  }
};

const isFormValid = computed(() => {
  if (!coupon.value.code?.trim()) return false;
  if (coupon.value.value === null || coupon.value.value === undefined || String(coupon.value.value) === "") return false;
  if (!coupon.value.startsAt) return false;
  if (!coupon.value.endsAt) return false;
  if (coupon.value.usage_limit === null || coupon.value.usage_limit === undefined || String(coupon.value.usage_limit) === "") return false;
  if (coupon.value.perUserLimit === null || coupon.value.perUserLimit === undefined || String(coupon.value.perUserLimit) === "") return false;
  if (
    coupon.value.kind === "group" &&
    (coupon.value.maxMember === null || coupon.value.maxMember === undefined || String(coupon.value.maxMember) === "")
  )
    return false;
  return true;
});

const createCoupon = async () => {
  if (isLoading.value) return;
  const now = new Date();
  const startsAt = coupon.value.startsAt
    ? new Date(coupon.value.startsAt)
    : null;
  const endsAt = coupon.value.endsAt ? new Date(coupon.value.endsAt) : null;
  
  // Cho phép lệch 1 phút để tránh lỗi đồng bộ
  const nowWithBuffer = new Date(now.getTime() - 60000);

  let msg = "";
  if (!coupon.value.code?.trim()) msg = "Vui lòng nhập mã giảm giá.";
  else if (!coupon.value.value || Number(coupon.value.value) <= 0)
    msg = "Giá trị giảm phải lớn hơn 0.";
  else if (!startsAt) msg = "Vui lòng chọn thời gian bắt đầu.";
  else if (startsAt < nowWithBuffer)
    msg = "Thời gian bắt đầu không được ở quá khứ.";
  else if (!endsAt) msg = "Vui lòng chọn thời gian kết thúc.";
  else if (endsAt <= startsAt)
    msg = "Thời gian kết thúc phải sau thời gian bắt đầu.";
  else if (!coupon.value.usage_limit || Number(coupon.value.usage_limit) <= 0)
    msg = "Số lượng mã giảm giá phải lớn hơn 0.";
  else if (!coupon.value.perUserLimit || Number(coupon.value.perUserLimit) <= 0)
    msg = "Giới hạn lượt sử dụng mỗi người phải lớn hơn 0.";
  else if (
    coupon.value.kind === "group" &&
    (!coupon.value.maxMember || coupon.value.maxMember < 2)
  )
    msg = "Số thành viên nhóm phải từ 2 trở lên.";

  if (msg) {
    alert(msg);
    return;
  }
  isLoading.value = true;
  try {
    await $fetch("/coupons/create-coupon", {
      method: "POST",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      body: coupon.value,
    });
    alert("Tạo mã giảm giá thành công!");
    emit("refresh");
    emit("close");
  } catch (err) {
    console.error(err);
    alert(err.data?.message || "Không thể tạo mã giảm giá!");
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchProducts);
</script>

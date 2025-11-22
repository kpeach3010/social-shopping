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
          />
        </div>

        <!-- Date -->
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

        <!-- Limits -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="font-medium">Giới hạn sử dụng</label>
            <input
              v-model="coupon.usage_limit"
              type="number"
              class="w-full border px-3 py-2 rounded"
            />
          </div>

          <div class="space-y-1">
            <label class="font-medium">Giới hạn mỗi người</label>
            <input
              v-model="coupon.perUserLimit"
              type="number"
              class="w-full border px-3 py-2 rounded"
            />
          </div>
        </div>

        <!-- Min Order -->
        <div class="space-y-1">
          <label class="font-medium">Đơn tối thiểu</label>
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
            <label class="font-medium">Thành viên tối đa</label>
            <input
              v-model="coupon.maxMember"
              type="number"
              class="w-full border px-3 py-2 rounded"
            />
          </div>

          <!-- Product List -->
          <div class="space-y-2">
            <label class="font-medium">Áp dụng cho sản phẩm</label>

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
        </template>

        <!-- Button -->
        <button
          class="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition"
          @click="createCoupon"
        >
          Tạo mã giảm giá
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { X } from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";
const emit = defineEmits(["close", "refresh"]);

const auth = useAuthStore();
const config = useRuntimeConfig();

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

const createCoupon = async () => {
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
    alert("Không thể tạo mã giảm giá!");
  }
};

onMounted(fetchProducts);
</script>

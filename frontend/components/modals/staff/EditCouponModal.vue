<script setup>
import { ref, watch } from "vue";
import { X } from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";

const props = defineProps({
  open: Boolean,
  couponData: Object, // dữ liệu coupon hiện tại
});
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
});

// Khi mở modal → clone dữ liệu vào form
watch(
  () => props.couponData,
  (val) => {
    if (val) {
      coupon.value = {
        code: val.code,
        description: val.description || "",
        kind: val.kind,
        type: val.type,
        value: val.value,
        startsAt: val.startsAt?.substring(0, 10) || "",
        endsAt: val.endsAt?.substring(0, 10) || "",
        usage_limit: val.usage_limit,
        perUserLimit: val.perUserLimit,
        minOrderTotal: val.minOrderTotal,
        maxMember: val.maxMember,
      };
    }
  },
  { immediate: true }
);

// gọi API update
const submit = async () => {
  try {
    await $fetch(`/coupons/update-coupon/${props.couponData.id}`, {
      baseURL: config.public.apiBase,
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
      },
      body: coupon.value,
    });

    alert("Cập nhật thành công!");
    emit("refresh");
    emit("close");
  } catch (err) {
    console.error("Update coupon error:", err);
    alert("Không thể cập nhật coupon!");
  }
};
</script>

<template>
  <div v-if="open" class="fixed inset-0 flex items-center justify-center z-50">
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
        class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center"
      >
        <h2 class="text-xl font-bold">Chỉnh sửa mã giảm giá</h2>
        <button @click="emit('close')" class="text-gray-600 hover:text-black">
          <X class="w-6 h-6" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 space-y-5">
        <!-- Code -->
        <div class="space-y-1">
          <label class="font-medium">Mã giảm giá</label>
          <input
            v-model="coupon.code"
            disabled
            class="w-full border px-3 py-2 rounded bg-gray-100"
          />
        </div>

        <!-- Description -->
        <div class="space-y-1">
          <label class="font-medium">Mô tả</label>
          <textarea
            v-model="coupon.description"
            class="w-full border px-3 py-2 rounded"
          ></textarea>
        </div>

        <!-- Kind + Type -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="font-medium">Hình thức</label>
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
          <label class="font-medium">Giá trị</label>
          <input
            v-model="coupon.value"
            type="number"
            class="w-full border px-3 py-2 rounded"
          />
        </div>

        <!-- Dates -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="font-medium">Ngày bắt đầu</label>
            <input
              v-model="coupon.startsAt"
              type="date"
              class="w-full border px-3 py-2 rounded"
            />
          </div>
          <div>
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
          <div>
            <label class="font-medium">Giới hạn sử dụng</label>
            <input
              v-model="coupon.usage_limit"
              type="number"
              class="w-full border px-3 py-2 rounded"
            />
          </div>
          <div>
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

        <!-- Group fields -->
        <div v-if="coupon.kind === 'group'" class="space-y-1">
          <label class="font-medium">Thành viên tối đa</label>
          <input
            v-model="coupon.maxMember"
            type="number"
            class="w-full border px-3 py-2 rounded"
          />
        </div>

        <!-- Save -->
        <button
          @click="submit"
          class="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition"
        >
          Lưu thay đổi
        </button>
      </div>
    </div>
  </div>
</template>

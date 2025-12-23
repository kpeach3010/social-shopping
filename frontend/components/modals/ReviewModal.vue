<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center">
    <div
      class="absolute inset-0 bg-black/30 backdrop-blur-sm"
      @click="close"
    ></div>

    <div
      class="relative bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[85vh] overflow-hidden z-10 border"
    >
      <div
        class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center"
      >
        <h2 class="text-lg font-semibold text-gray-800">Đánh giá sản phẩm</h2>
        <button class="text-gray-400 hover:text-black text-xl" @click="close">
          ✕
        </button>
      </div>

      <div class="p-6 space-y-4 overflow-y-auto max-h-[65vh]">
        <!-- Product info -->
        <div class="flex gap-3">
          <img
            :src="product.imageUrl"
            class="w-16 h-16 object-cover border"
            alt="product"
          />
          <div>
            <p class="font-medium">{{ product.name }}</p>
            <p class="text-sm text-gray-500">{{ product.variant }}</p>
          </div>
        </div>

        <!-- Rating -->
        <div>
          <p class="text-sm mb-1">Chất lượng sản phẩm *</p>
          <div class="flex gap-1">
            <span
              v-for="i in 5"
              :key="i"
              @click="form.rating = i"
              class="cursor-pointer text-2xl select-none"
              :class="i <= form.rating ? 'text-yellow-400' : 'text-gray-300'"
            >
              ★
            </span>
          </div>
        </div>

        <!-- Comment -->
        <textarea
          v-model="form.comment"
          rows="4"
          placeholder="Chia sẻ cảm nhận của bạn..."
          class="w-full border rounded p-2 focus:outline-none focus:ring-1 focus:ring-black"
        />

        <!-- Media -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700"
            >Thêm ảnh / video</label
          >
          <input
            ref="fileInput"
            type="file"
            multiple
            accept="image/*,video/*"
            @change="onSelectFiles"
            class="hidden"
          />
          <button
            type="button"
            class="inline-flex items-center gap-2 px-4 py-2 border rounded hover:bg-gray-50"
            @click="triggerFilePicker"
            :disabled="loading"
          >
            <ArrowUpTrayIcon class="w-5 h-5" />
            <span>Chọn file</span>
            <span class="text-xs text-gray-500">(tối đa 5)</span>
          </button>
        </div>

        <!-- Preview -->
        <div
          v-if="form.files.length"
          class="grid grid-cols-2 sm:grid-cols-3 gap-3"
        >
          <div
            v-for="(item, idx) in form.files"
            :key="idx"
            class="relative border rounded overflow-hidden group"
          >
            <button
              type="button"
              class="absolute top-1 right-1 bg-black/60 text-white text-xs rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition"
              aria-label="Xóa file"
              @click="removeFile(idx)"
            >
              ×
            </button>
            <video
              v-if="item.isVideo"
              :src="item.url"
              class="w-full h-28 object-cover"
              controls
            />
            <img
              v-else
              :src="item.url"
              :alt="item.file.name"
              class="w-full h-28 object-cover"
            />
            <div class="px-2 py-1 text-[11px] truncate">
              {{ item.file.name }}
            </div>
          </div>
        </div>
      </div>

      <div
        class="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-2"
      >
        <button
          @click="close"
          class="px-4 py-2 border rounded hover:bg-gray-100"
          :disabled="loading"
        >
          Hủy
        </button>
        <button
          @click="submitReview"
          class="px-4 py-2 bg-black text-white rounded hover:bg-gray-900 disabled:opacity-50"
          :disabled="loading"
        >
          {{ loading ? "Đang gửi..." : "Gửi đánh giá" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from "vue";
import { ArrowUpTrayIcon } from "@heroicons/vue/24/outline";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
const config = useRuntimeConfig();

/* ================= STATE ================= */
const show = ref(false);
const loading = ref(false);
const fileInput = ref(null);

const form = reactive({
  productId: null,
  orderItemId: null,
  rating: 0,
  comment: "",
  files: [], // [{ file, url, isVideo }]
});

const product = reactive({
  name: "",
  variant: "",
  imageUrl: "",
});

/* ================= METHODS ================= */
const open = (payload) => {
  form.productId = payload.productId ?? payload.productID ?? null;
  form.orderItemId = payload.orderItemId ?? payload.id ?? null;
  form.rating = 0;
  form.comment = "";
  clearFiles();

  product.name = payload.productName;
  product.variant = payload.variantName;
  product.imageUrl = payload.imageUrl;

  if (fileInput.value) fileInput.value.value = null;

  show.value = true;
};

const close = () => {
  show.value = false;
};

defineExpose({ open });

const onSelectFiles = (e) => {
  const picked = Array.from(e.target.files || []);

  // Validate dung lượng (50MB mỗi file)
  for (const f of picked) {
    if (f.size > 50 * 1024 * 1024) {
      alert("File vượt quá 50MB");
      e.target.value = null;
      return;
    }
  }

  const mapped = picked.map((file) => ({
    file,
    url: URL.createObjectURL(file),
    isVideo: file.type?.startsWith("video"),
  }));

  const merged = [...form.files, ...mapped];

  // Validate tổng số lượng (tối đa 5)
  if (merged.length > 5) {
    alert("Tối đa 5 file ảnh / video");
    e.target.value = null;
    mapped.forEach((m) => URL.revokeObjectURL(m.url));
    return;
  }

  form.files = merged;
};

const removeFile = (idx) => {
  const target = form.files[idx];
  if (target) URL.revokeObjectURL(target.url);
  form.files.splice(idx, 1);
};

const triggerFilePicker = () => {
  if (fileInput.value) fileInput.value.click();
};

const clearFiles = () => {
  form.files.forEach((f) => URL.revokeObjectURL(f.url));
  form.files = [];
};

const submitReview = async () => {
  if (loading.value) return;

  if (!form.orderItemId || !form.productId) {
    alert("Thiếu thông tin sản phẩm trong đơn hàng");
    return;
  }

  if (!form.rating) {
    alert("Vui lòng chọn số sao đánh giá");
    return;
  }

  loading.value = true;

  try {
    const formData = new FormData();
    formData.append("productId", String(form.productId));
    formData.append("orderItemId", String(form.orderItemId));
    formData.append("rating", form.rating);
    formData.append("comment", form.comment);

    form.files.forEach((fileWrapper) => {
      formData.append("media", fileWrapper.file);
    });

    const res = await fetch(`${config.public.apiBase}/reviews`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Gửi đánh giá thất bại");
    }

    alert("Đánh giá thành công");
    clearFiles();
    close();
  } catch (err) {
    console.error(err);
    alert(err.message || "Có lỗi xảy ra");
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div
    class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-hidden p-3"
  >
    <div
      class="bg-white w-full max-w-lg rounded-lg flex flex-col my-4 max-h-[90vh]"
    >
      <!-- Header -->
      <div class="p-4 border-b shrink-0">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold">
            {{ mode === "edit" ? "Chỉnh sửa bài viết" : "Tạo bài viết" }}
          </h3>
          <button
            @click="$emit('close')"
            class="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        <div class="relative">
          <label class="block text-xs font-medium mb-1">Nội dung</label>
          <textarea
            v-model="form.content"
            rows="7"
            class="w-full border rounded-lg p-2 text-sm resize-none"
            placeholder="Bạn đang nghĩ gì?"
          />
          <div class="flex items-center mt-1">
            <button
              type="button"
              @click="showPostEmoji = !showPostEmoji"
              class="text-gray-400 hover:text-yellow-500 transition"
              title="Chọn emoji"
            >
              <FaceSmileIcon class="w-5 h-5" />
            </button>
          </div>
          <div
            v-if="showPostEmoji"
            ref="postEmojiRef"
            class="absolute left-0 z-50"
          >
            <EmojiPicker @select="onPostEmoji" />
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium mb-1">Quyền riêng tư</label>
          <select
            v-model="form.visibility"
            class="w-full border rounded-lg p-2 text-sm"
          >
            <option value="public">🌍 Công khai</option>
            <option value="friends">👥 Bạn bè</option>
            <option value="private">🔒 Riêng tư</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-medium mb-1"
            >Tập tin / Ảnh / Video</label
          >
          <div
            @drop="handleDrop"
            @dragover.prevent
            @dragenter.prevent
            class="border-2 border-dashed border-gray-300 rounded-lg p-2 text-center cursor-pointer hover:border-gray-400 transition"
          >
            <input
              ref="fileInput"
              type="file"
              multiple
              accept="*/*"
              @change="handleFiles"
              class="hidden"
            />
            <div @click="$refs.fileInput?.click()" class="text-xs">
              <p class="text-gray-600">Kéo file hoặc nhấp</p>
              <p class="text-gray-400">({{ form.files.length }}/10 file)</p>
            </div>
          </div>
        </div>

        <div v-if="form.existingMedia.length > 0 || form.files.length > 0">
          <div class="grid grid-cols-5 gap-1">
            <!-- Existing Media -->
            <div
              v-for="media in form.existingMedia"
              :key="'media-' + media.id"
              class="relative bg-gray-100 rounded overflow-hidden aspect-square"
            >
              <img
                v-if="media.type === 'image'"
                :src="media.postFileUrl"
                class="w-full h-full object-cover"
              />
              <video
                v-else-if="media.type === 'video'"
                :src="media.postFileUrl"
                class="w-full h-full object-cover"
              ></video>
              <div
                v-else
                class="w-full h-full bg-white border border-gray-200 flex flex-col items-center justify-center text-[10px] px-1 text-gray-600"
              >
                <span class="text-xs font-semibold">FILE</span>
              </div>
              <button
                type="button"
                @click="removeExistingMedia(media.id)"
                class="absolute top-0 right-0 bg-red-500 text-white w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
              >
                ×
              </button>
            </div>
            <!-- New Files -->
            <div
              v-for="(file, idx) in form.files"
              :key="'file-' + idx"
              class="relative bg-gray-100 rounded overflow-hidden aspect-square"
            >
              <img
                v-if="filePreviews[idx] && file.type.startsWith('image')"
                :src="filePreviews[idx]"
                class="w-full h-full object-cover"
              />
              <div
                v-else-if="file.type.startsWith('video')"
                class="w-full h-full bg-gray-800 flex items-center justify-center text-white text-lg"
              >
                ▶
              </div>
              <div
                v-else
                class="w-full h-full bg-white border border-gray-200 flex flex-col items-center justify-center text-[10px] px-1 text-gray-600"
              >
                <span class="text-xs font-semibold">FILE</span>
                <span class="truncate w-full">{{ getFileLabel(file) }}</span>
              </div>
              <button
                type="button"
                @click="removeFile(idx)"
                class="absolute top-0 right-0 bg-red-500 text-white w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium mb-1"
            >Sản phẩm đính kèm ({{ form.productIds.length }})</label
          >
          <div
            class="max-h-32 overflow-y-auto border rounded-lg p-1 bg-gray-50 space-y-1"
          >
            <label
              v-for="product in products"
              :key="product.id"
              class="flex items-center p-1 hover:bg-white rounded cursor-pointer transition text-xs"
            >
              <input
                type="checkbox"
                :checked="form.productIds.includes(product.id)"
                @change="toggleProduct(product.id)"
                class="w-3 h-3 mr-1 shrink-0"
              />
              <img
                v-if="product.thumbnailUrl"
                :src="product.thumbnailUrl"
                class="w-6 h-6 object-cover rounded mr-1 shrink-0"
                :alt="product.name"
              />
              <p class="truncate">{{ product.name }}</p>
            </label>
          </div>
        </div>

        <div v-if="form.productIds.length > 0" class="flex flex-wrap gap-1">
          <div
            v-for="productId in form.productIds"
            :key="productId"
            class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs flex items-center"
          >
            <span class="truncate max-w-[120px]">{{
              products.find((p) => p.id === productId)?.name
            }}</span>
            <button
              type="button"
              @click="toggleProduct(productId)"
              class="ml-1 font-bold hover:text-blue-600"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t p-4 shrink-0">
        <button
          @click="submit"
          :disabled="isLoading"
          class="w-full py-2 bg-black text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition"
        >
          {{ isLoading ? "Đang đăng..." : "Đăng bài" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from "@/stores/auth";
import EmojiPicker from "@/components/chat/EmojiPicker.vue";
import { FaceSmileIcon } from "@heroicons/vue/24/outline";

const props = defineProps({
  products: Array,
  mode: { type: String, default: "create" },
  post: { type: Object, default: null },
});
const emit = defineEmits(["close", "created", "updated"]);

const auth = useAuthStore();
const config = useRuntimeConfig();
const isLoading = ref(false);
const fileInput = ref(null);
const filePreviews = ref({});

const showPostEmoji = ref(false);
const postEmojiRef = ref(null);

const onPostEmoji = (emoji) => {
  form.content += emoji;
};

function handleClickOutsidePostEmoji(e) {
  if (
    postEmojiRef.value &&
    !postEmojiRef.value.contains(e.target) &&
    !e.target.closest('[title="Chọn emoji"]')
  ) {
    showPostEmoji.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutsidePostEmoji);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutsidePostEmoji);
});

const form = reactive({
  content: props.post?.content || "",
  visibility: props.post?.visibility || "public",
  productIds: props.post?.products?.map((p) => p.id) || [],
  files: [],
  existingMedia: props.post?.media || [],
  deleteMediaIds: [],
  deleteProductIds: [],
});

const handleFiles = (e) => {
  const newFiles = Array.from(e.target.files);
  if (form.files.length + newFiles.length > 10) {
    alert("Tối đa 10 file");
    return;
  }

  newFiles.forEach((file) => {
    // Lưu index trước khi push để tránh lỗi async
    const fileIndex = form.files.length;
    form.files.push(file);

    // Preview cho ảnh
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        // Dùng index đã lưu, không dùng form.files.length
        filePreviews.value[fileIndex] = ev.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      filePreviews.value[fileIndex] = null;
    }
  });
};

const handleDrop = (e) => {
  e.preventDefault();
  const files = e.dataTransfer.files;
  const dataTransfer = new DataTransfer();
  Array.from(files).forEach((file) => dataTransfer.items.add(file));
  fileInput.value.files = dataTransfer.files;
  handleFiles({ target: { files: dataTransfer.files } });
};

const removeFile = (idx) => {
  form.files.splice(idx, 1);
  const newPreviews = {};
  Object.keys(filePreviews.value).forEach((key) => {
    if (parseInt(key) < idx) newPreviews[key] = filePreviews.value[key];
    else if (parseInt(key) > idx)
      newPreviews[parseInt(key) - 1] = filePreviews.value[key];
  });
  filePreviews.value = newPreviews;
};

const removeExistingMedia = (mediaId) => {
  form.existingMedia = form.existingMedia.filter((m) => m.id !== mediaId);
  form.deleteMediaIds.push(mediaId);
};

const toggleProduct = (productId) => {
  const idx = form.productIds.indexOf(productId);
  if (idx > -1) {
    form.productIds.splice(idx, 1);
    if (
      props.mode === "edit" &&
      props.post?.products?.some((p) => p.id === productId)
    ) {
      form.deleteProductIds.push(productId);
    }
  } else {
    form.productIds.push(productId);
    const deleteIdx = form.deleteProductIds.indexOf(productId);
    if (deleteIdx > -1) form.deleteProductIds.splice(deleteIdx, 1);
  }
};

const getFileLabel = (file) => {
  if (!file?.name) return "Tệp";
  // Bỏ prefix timestamp nếu có dạng 1712345678-filename.ext
  const parts = file.name.split("-");
  if (parts.length > 1 && /^\d{6,}$/.test(parts[0])) {
    parts.shift();
    return parts.join("-");
  }
  return file.name;
};

const submit = async () => {
  if (!form.content.trim()) {
    alert("Vui lòng nhập nội dung bài viết");
    return;
  }
  isLoading.value = true;
  try {
    const fd = new FormData();
    fd.append("content", form.content);
    fd.append("visibility", form.visibility);

    if (props.mode === "edit") {
      // Chỉ gửi productIds mới thêm
      const newProductIds = form.productIds.filter(
        (id) => !props.post?.products?.some((p) => p.id === id),
      );
      fd.append("productIds", JSON.stringify(newProductIds));
      fd.append("deleteMediaIds", JSON.stringify(form.deleteMediaIds));
      fd.append("deleteProductIds", JSON.stringify(form.deleteProductIds));
    } else {
      fd.append("productIds", JSON.stringify(form.productIds));
    }

    form.files.forEach((f) => fd.append("files", f));

    const url = props.mode === "edit" ? `/posts/${props.post.id}` : "/posts";
    const method = props.mode === "edit" ? "PATCH" : "POST";

    const res = await $fetch(url, {
      method,
      body: fd,
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    if (props.mode === "edit") {
      emit("updated", res.data);
    } else {
      emit("created", res.data);
    }
    emit("close");
  } catch (error) {
    console.error("Error submitting post:", error);
    alert(
      (props.mode === "edit" ? "Không thể cập nhật" : "Không thể tạo") +
        " bài viết: " +
        (error.data?.message || error.message),
    );
  } finally {
    isLoading.value = false;
  }
};
</script>

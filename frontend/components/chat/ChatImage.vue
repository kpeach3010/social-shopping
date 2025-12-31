<template>
  <div class="relative">
    <div
      v-if="loading"
      class="w-48 h-48 bg-gray-200 animate-pulse rounded-lg"
    ></div>

    <img
      v-else-if="imageUrl"
      :src="imageUrl"
      alt="Ảnh tin nhắn"
      class="max-w-[200px] rounded-lg cursor-pointer hover:opacity-90 transition"
    />

    <div v-else class="text-red-500 text-xs bg-red-50 p-2 rounded">
      Lỗi tải ảnh
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
const { $supabase } = useNuxtApp();

const props = defineProps({
  path: String, // Đây là content lấy từ message
});

const imageUrl = ref("");
const loading = ref(true);

onMounted(() => {
  try {
    if (!props.path) return;

    const { data } = $supabase.storage
      .from("chat-attachments")
      .getPublicUrl(props.path);

    if (data) {
      imageUrl.value = data.publicUrl;
    }
  } catch (err) {
    console.error("Lỗi lấy link ảnh:", err);
  } finally {
    loading.value = false;
  }
});

const previewImage = () => {
  window.open(imageUrl.value, "_blank");
};
</script>

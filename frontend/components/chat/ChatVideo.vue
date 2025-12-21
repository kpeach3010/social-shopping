<template>
  <div class="rounded-lg overflow-hidden bg-black max-w-[400px] relative group">
    <div
      v-if="loading"
      class="flex items-center justify-center h-32 w-full bg-gray-900 text-gray-400 text-xs"
    >
      <span class="animate-pulse">Đang tải video...</span>
    </div>

    <div
      v-else-if="!videoUrl"
      class="flex items-center justify-center h-32 w-full bg-gray-900 text-red-400 text-xs"
    >
      Lỗi tải video
    </div>

    <video
      v-else
      controls
      preload="metadata"
      class="w-full h-auto max-h-[350px] object-contain"
    >
      <source :src="videoUrl" type="video/mp4" />
      Trình duyệt của bạn không hỗ trợ thẻ video.
    </video>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
const { $supabase } = useNuxtApp();
const props = defineProps({ path: String });

const videoUrl = ref("");
const loading = ref(true);

onMounted(() => {
  try {
    if (!props.path) return;

    const { data } = $supabase.storage
      .from("chat-attachments")
      .getPublicUrl(props.path);

    if (data) {
      videoUrl.value = data.publicUrl;
    }
  } catch (err) {
    console.error("Lỗi lấy link video:", err);
  } finally {
    loading.value = false;
  }
});
</script>

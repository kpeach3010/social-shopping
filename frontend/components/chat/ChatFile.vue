<template>
  <div class="flex items-center gap-2">
    <div class="p-2 bg-gray-100 rounded-lg">
      <PaperClipIcon class="w-5 h-5 text-gray-600" />
    </div>

    <div v-if="loading" class="text-xs text-gray-400">Đang tải link...</div>

    <a
      v-else-if="fileUrl"
      :href="fileUrl"
      target="_blank"
      class="text-sm text-blue-600 hover:underline truncate max-w-[200px]"
      :title="fileName"
    >
      {{ fileName }}
    </a>

    <span v-else class="text-xs text-red-500">Lỗi file</span>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { PaperClipIcon } from "@heroicons/vue/24/outline";

const { $supabase } = useNuxtApp();

const props = defineProps({
  path: String,
});

const fileUrl = ref("");
const loading = ref(true);

// Lấy tên file từ đường dẫn
const fileName = computed(() => {
  if (!props.path) return "Tập tin";
  // Tách tên file từ path (VD: "uuid_tenfile.pdf" -> "tenfile.pdf")
  const parts = props.path.split("/");
  const fullName = parts[parts.length - 1];
  // Bỏ phần timestamp/uuid prefix
  return fullName.split("_").slice(1).join("_") || fullName;
});

onMounted(() => {
  try {
    if (!props.path) return;

    const { data } = $supabase.storage
      .from("chat-attachments")
      .getPublicUrl(props.path);

    if (data) {
      fileUrl.value = data.publicUrl;
    }
  } catch (err) {
    console.error("Lỗi lấy link file:", err);
  } finally {
    loading.value = false;
  }
});
</script>

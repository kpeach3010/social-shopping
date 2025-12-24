<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
    @click.self="close"
  >
    <button
      @click="close"
      class="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl z-10"
    >
      ×
    </button>

    <div class="flex items-center justify-between w-full max-w-4xl">
      <button
        @click="prevMedia"
        class="text-white hover:bg-white/20 p-2 rounded-full transition"
      >
        <svg
          class="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          ></path>
        </svg>
      </button>

      <div class="flex-1 flex flex-col items-center justify-center">
        <video
          v-if="currentMediaIndex !== null && isVideo(currentMedia)"
          :src="getMediaUrl(currentMedia)"
          controls
          class="max-w-full max-h-[80vh] rounded"
          autoplay
        ></video>
        <img
          v-else-if="currentMediaIndex !== null && !isVideo(currentMedia)"
          :src="getMediaUrl(currentMedia)"
          class="max-w-full max-h-[80vh] rounded"
        />
        <p class="text-white text-sm mt-4">
          {{ currentMediaIndex + 1 }} / {{ mediaList.length }}
        </p>
      </div>

      <button
        @click="nextMedia"
        class="text-white hover:bg-white/20 p-2 rounded-full transition"
      >
        <svg
          class="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5l7 7-7 7"
          ></path>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true,
  },
  mediaList: {
    type: Array,
    required: true,
  },
  startIndex: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(["close"]);

const currentMediaIndex = ref(props.startIndex);

const close = () => {
  emit("close");
};

const nextMedia = () => {
  if (currentMediaIndex.value < props.mediaList.length - 1) {
    currentMediaIndex.value++;
  }
};

const prevMedia = () => {
  if (currentMediaIndex.value > 0) {
    currentMediaIndex.value--;
  }
};

const currentMedia = computed(() => props.mediaList[currentMediaIndex.value]);

// Helper to check if media is video
const isVideo = (media) => {
  if (!media) return false;
  // Check for postFileUrl (from feed) or fileUrl (from reviews)
  const url = media.postFileUrl || media.fileUrl || "";
  const videoExtensions = [".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv"];
  return videoExtensions.some((ext) => url.toLowerCase().includes(ext));
};

// Helper to get media URL
const getMediaUrl = (media) => {
  return media?.postFileUrl || media?.fileUrl || "";
};

// Watch for changes in startIndex from parent
watch(
  () => props.startIndex,
  (newIndex) => {
    currentMediaIndex.value = newIndex;
  }
);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6"
      @click.self="close"
    >
      <div
        class="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in duration-300"
      >
        <!-- Header (Reduced padding) -->
        <div class="flex items-center justify-between px-4 py-2 sm:py-2.5 border-b shrink-0 bg-gray-50/50">
          <h3 class="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 text-blue-600">
              <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
            Hướng dẫn chọn ảnh
          </h3>
          <button
            type="button"
            class="p-1.5 rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition"
            @click="close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        
        <!-- Content (More space for image) -->
        <div class="p-2 sm:p-4 overflow-y-auto bg-gray-50/30">
          <div class="bg-white p-1 rounded-2xl shadow-inner border border-gray-100 mb-3 flex justify-center">
            <img 
              :src="'/hdsd.png'" 
              alt="Hướng dẫn chọn ảnh" 
              class="max-w-full h-auto rounded-xl shadow-sm"
            />
          </div>
          
          <!-- Footer button (Smaller) -->
          <div class="flex justify-center pb-2">
            <button
              type="button"
              class="px-8 py-2 bg-gray-900 text-white rounded-lg text-xs sm:text-sm font-bold hover:bg-black transition active:scale-95 shadow-md"
              @click="close"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  isOpen: { type: Boolean, default: false }
});

const emit = defineEmits(['close']);

const close = () => {
  emit('close');
};
</script>

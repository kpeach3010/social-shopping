<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      :class="[
        'fixed inset-0 flex items-center justify-center bg-black/50 p-4',
        elevated ? 'z-[1100]' : 'z-[1000]'
      ]"
      @click.self="$emit('close')"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <h3 class="text-base font-semibold text-gray-900">Gửi vào cuộc trò chuyện</h3>
          <button
            @click="$emit('close')"
            class="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition"
          >
            <XMarkIcon class="w-5 h-5" />
          </button>
        </div>

        <!-- Preview ảnh -->
        <div class="px-5 pt-4 shrink-0">
          <p class="text-xs text-gray-500 mb-2 font-medium">Ảnh thử đồ ảo</p>
          <div class="rounded-xl overflow-hidden border bg-gray-50 flex items-center justify-center" style="max-height: 180px;">
            <img
              v-if="imagePreviewUrl"
              :src="imagePreviewUrl"
              alt="Kết quả thử đồ"
              class="max-h-[180px] max-w-full object-contain"
            />
            <div v-else class="text-gray-400 py-8 text-sm">Không có ảnh</div>
          </div>
        </div>

        <!-- Danh sách conversation -->
        <div class="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          <p class="text-xs text-gray-500 mb-3 font-medium">Chọn cuộc trò chuyện</p>

          <!-- Loading -->
          <div v-if="loadingConvs" class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-7 w-7 border-b-2 border-gray-800"></div>
          </div>

          <!-- Empty -->
          <div
            v-else-if="conversations.length === 0"
            class="text-center py-8 text-gray-400 text-sm"
          >
            Bạn chưa có cuộc trò chuyện nào
          </div>

          <!-- List -->
          <div v-else class="space-y-1.5">
            <button
              v-for="conv in conversations"
              :key="conv.id"
              @click="selectedConvId = conv.id"
              :disabled="sending"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition text-left"
              :class="
                selectedConvId === conv.id
                  ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900'
                  : 'border-gray-200 hover:bg-gray-50'
              "
            >
              <!-- Avatar -->
              <div class="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center shrink-0 text-gray-600">
                <UsersIcon v-if="conv.type === 'group'" class="w-4 h-4" />
                <UserCircleIcon v-else class="w-5 h-5" />
              </div>
              <!-- Name -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">
                  {{ conv.name || 'Cuộc trò chuyện' }}
                </p>
                <p class="text-xs text-gray-400 truncate">
                  {{ conv.type === 'group' ? 'Nhóm' : 'Cá nhân' }}
                </p>
              </div>
              <!-- Check -->
              <CheckCircleIcon
                v-if="selectedConvId === conv.id"
                class="w-5 h-5 text-gray-900 shrink-0"
              />
            </button>
          </div>
        </div>

        <!-- Error -->
        <p v-if="errorMsg" class="px-5 pb-2 text-sm text-red-500 text-center shrink-0">
          {{ errorMsg }}
        </p>

        <!-- Footer -->
        <div class="px-5 py-4 border-t shrink-0">
          <button
            @click="send"
            :disabled="!selectedConvId || sending"
            class="w-full py-2.5 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2"
            :class="
              selectedConvId && !sending
                ? 'bg-gray-900 text-white hover:bg-gray-700 active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            "
          >
            <span
              v-if="sending"
              class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
            />
            <PaperAirplaneIcon v-else class="w-4 h-4" />
            <span>{{ sending ? 'Đang gửi...' : 'Gửi ảnh' }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import {
  XMarkIcon,
  UserCircleIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
} from '@heroicons/vue/24/outline';
import { UsersIcon } from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  imagePreviewUrl: { type: String, default: '' },
  imageFile: { type: File, default: null },
  elevated: { type: Boolean, default: false }, // hiển thị trên modal khác (z-[1100])
});

const emit = defineEmits(['close', 'sent']);

const auth = useAuthStore();
const config = useRuntimeConfig();

const conversations = ref([]);
const selectedConvId = ref(null);
const loadingConvs = ref(false);
const sending = ref(false);
const errorMsg = ref('');

// Fetch conversation list khi modal mở
watch(
  () => props.isOpen,
  async (open) => {
    if (!open) {
      selectedConvId.value = null;
      errorMsg.value = '';
      return;
    }
    await fetchConversations();
  },
);

async function fetchConversations() {
  loadingConvs.value = true;
  errorMsg.value = '';
  try {
    const data = await $fetch('/conversations', {
      method: 'GET',
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    conversations.value = data || [];
  } catch (err) {
    console.error('Lỗi tải danh sách cuộc trò chuyện:', err);
    errorMsg.value = 'Không thể tải danh sách cuộc trò chuyện';
  } finally {
    loadingConvs.value = false;
  }
}

async function send() {
  if (!selectedConvId.value || !props.imageFile || sending.value) return;
  sending.value = true;
  errorMsg.value = '';

  try {
    const formData = new FormData();
    formData.append('file', props.imageFile, 'tryon_result.jpg');
    formData.append('type', 'image');
    formData.append('content', '');

    await $fetch(`/messages/${selectedConvId.value}`, {
      method: 'POST',
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      body: formData,
    });

    emit('sent', { conversationId: selectedConvId.value });
    emit('close');

    // Thông báo thành công
    const nuxtApp = useNuxtApp();
    if (nuxtApp.$toast) {
      nuxtApp.$toast.success('Đã gửi ảnh vào cuộc trò chuyện!');
    } else {
      alert('Đã gửi ảnh vào cuộc trò chuyện!');
    }
  } catch (err) {
    console.error('Lỗi gửi ảnh:', err);
    errorMsg.value = err?.data?.message || err?.message || 'Gửi thất bại, vui lòng thử lại';
  } finally {
    sending.value = false;
  }
}
</script>

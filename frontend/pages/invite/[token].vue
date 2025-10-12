<template>
  <div
    class="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100"
  >
    <div class="bg-white rounded-xl shadow-lg p-8 w-full max-w-md text-center">
      <h1 class="text-2xl font-bold text-indigo-700 mb-4">
        Mời tham gia nhóm mua chung
      </h1>
      <div v-if="loading" class="my-6">
        <span class="text-gray-500">Đang kiểm tra link mời...</span>
      </div>
      <div v-else-if="success" class="my-6">
        <span class="text-green-600 font-semibold text-lg"
          >Tham gia nhóm thành công!</span
        >
        <div class="mt-4">
          <button
            @click="openChatBox"
            class="px-5 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-semibold"
          >
            Vào chat nhóm
          </button>
        </div>
      </div>
      <div v-else-if="error" class="my-6">
        <span class="text-red-500 font-semibold text-lg">{{ error }}</span>
        <div class="mt-4">
          <button
            @click="goHome"
            class="px-5 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-semibold"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
const route = useRoute();
const router = useRouter();
const config = useRuntimeConfig();
const auth = useAuthStore();

const loading = ref(true);
const success = ref(false);
const error = ref("");
const conversation = ref(null);

onMounted(async () => {
  const token = route.params.token;
  if (!token) {
    error.value = "Link mời không hợp lệ.";
    loading.value = false;
    return;
  }
  if (!auth.accessToken) {
    error.value = "Bạn cần đăng nhập để tham gia nhóm.";
    loading.value = false;
    return;
  }
  try {
    const res = await $fetch("/conversations/join-group", {
      method: "POST",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      body: { invitelink: token },
    });
    if (!res || !res.conversation) {
      throw new Error("Không tìm thấy nhóm hoặc nhóm đã bị khóa.");
    }
    conversation.value = res.conversation;
    success.value = true;
  } catch (e) {
    // Hiển thị lỗi chi tiết, bao gồm lỗi HTTP
    if (e?.response?.status === 404) {
      error.value = "Nhóm không tồn tại hoặc link mời đã hết hạn.";
    } else if (e?.response?.status === 409) {
      error.value = "Bạn đã tham gia nhóm này hoặc nhóm đã đủ thành viên.";
    } else {
      error.value = `[${e?.response?.status || "POST"}] \"${
        e?.response?.url || ""
      }\": ${e?.message || e?.data?.message || "Không thể tham gia nhóm."}`;
    }
  } finally {
    loading.value = false;
  }
});

function openChatBox() {
  if (conversation.value) {
    window.dispatchEvent(
      new CustomEvent("open-group-chat", { detail: conversation.value })
    );
    router.push("/");
  }
}
function goHome() {
  router.push("/");
}
</script>

<style scoped>
body {
  background: linear-gradient(135deg, #e0e7ff 0%, #f1f5fe 100%);
}
</style>

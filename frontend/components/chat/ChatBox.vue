<template>
  <div
    v-if="partner"
    class="fixed bottom-6 right-6 w-96 h-[520px] bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col z-40 overflow-hidden"
  >
    <!-- Header -->
    <div class="flex items-center p-3 border-b border-gray-200 bg-gray-100">
      <UserCircleIcon class="w-8 h-8 text-gray-500 mr-2" />
      <span class="font-semibold text-gray-700 flex-1">
        {{ partner.fullName }}
      </span>
      <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
        ✕
      </button>
    </div>

    <!-- Messages -->
    <div
      ref="scrollWrap"
      class="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50"
    >
      <div
        v-for="msg in messages"
        :key="msg.id || msg.tempId"
        class="flex"
        :class="isMine(msg) ? 'justify-end' : 'justify-start'"
      >
        <div
          :class="[
            'px-4 py-2 rounded-2xl max-w-[72%] text-sm break-words',
            isMine(msg)
              ? 'bg-blue-600 text-white rounded-br-none'
              : 'bg-gray-200 text-gray-800 rounded-bl-none',
          ]"
        >
          <div>{{ msg.content }}</div>

          <!-- trạng thái gửi -->
          <div
            v-if="isMine(msg) && msg.status"
            class="mt-1 text-[11px] opacity-80"
          >
            <span v-if="msg.status === 'sending'">Đang gửi…</span>
            <span v-else-if="msg.status === 'sent'">Đã gửi</span>
            <span v-else-if="msg.status === 'error'">Lỗi, thử lại</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Typing -->
    <div v-if="typing" class="px-3 py-2 text-gray-500 text-sm italic">
      {{ partner.fullName }} đang nhập...
    </div>

    <!-- Input -->
    <div class="flex items-center p-3 border-t border-gray-200 bg-white">
      <input
        v-model="message"
        @keydown="emitTyping"
        @keyup.enter="sendMessage"
        placeholder="Aa..."
        class="flex-1 px-3 py-2 rounded-full border border-gray-300 mr-2 focus:outline-none focus:ring focus:ring-blue-200"
      />
      <button
        @click="sendMessage"
        :disabled="loading || !message.trim()"
        class="px-4 py-2 rounded-full bg-blue-600 text-white disabled:bg-gray-400"
      >
        Gửi
      </button>
    </div>
  </div>
</template>

<script setup>
import { UserCircleIcon } from "@heroicons/vue/24/outline";
import supabase from "@/plugins/supabase";
import { useAuthStore } from "@/stores/auth";

const props = defineProps({
  conversationId: String,
  partner: Object,
  currentUserId: String,
});
const emit = defineEmits(["close", "update:conversationId"]);

const { $socket } = useNuxtApp();
const config = useRuntimeConfig();
const auth = useAuthStore();

// state
const messages = ref([]);
const message = ref("");
const loading = ref(false);
const typing = ref(false);
let typingTimeout = null;

const deliveredIds = new Set(); // lọc trùng
const pendingMap = new Map(); // tempId -> index

const isMine = (m) => (m.senderId || m.sender_id) === props.currentUserId; // sendenId nếu lấy từ frontend, sender_id nếu từ DB
const normalize = (raw) => ({
  id: raw.id ?? null,
  tempId: raw.tempId ?? null,
  conversationId: raw.conversationId ?? raw.conversation_id ?? null,
  senderId: raw.senderId ?? raw.sender_id ?? null,
  content: raw.content ?? "",
  status: raw.status ?? undefined,
  createdAt: raw.createdAt ?? raw.created_at ?? null,
});

function scrollToBottom() {
  requestAnimationFrame(() => {
    const el = scrollWrap.value;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  });
}

const scrollWrap = ref(null);

watch(
  () => props.conversationId,
  async (convId) => {
    // reset lại state khi đổi conversation
    messages.value = [];
    deliveredIds.clear();
    pendingMap.clear();

    if (!convId) return;

    try {
      // gọi API lấy lịch sử tin nhắn
      const data = await $fetch(`/conversations/${convId}/messages`, {
        method: "GET",
        baseURL: config.public.apiBase,
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
        },
      });

      const norm = data.map(normalize);
      norm.forEach((m) => {
        if (m.id) deliveredIds.add(m.id);
      });

      messages.value = norm;
      scrollToBottom();
    } catch (e) {
      console.error("Lỗi load messages:", e);
    }

    $socket.emit("join-conversation", convId);
  },
  { immediate: true }
);

onMounted(() => {
  $socket.on("message", (raw) => {
    const msg = normalize(raw);
    if (msg.conversationId !== props.conversationId) return;
    if (msg.id && deliveredIds.has(msg.id)) return;

    if (isMine(msg)) {
      // tìm pending gần nhất có cùng content
      const idx = [...pendingMap.values()].find(
        (i) =>
          messages.value[i]?.status === "sending" &&
          messages.value[i]?.content === msg.content
      );
      if (idx !== undefined && idx !== null) {
        messages.value[idx] = { ...msg, status: "sent" };
        deliveredIds.add(msg.id);
        scrollToBottom();
        return;
      }
    }

    messages.value.push({ ...msg, status: isMine(msg) ? "sent" : undefined });
    if (msg.id) deliveredIds.add(msg.id);
    scrollToBottom();
  });

  $socket.on("typing", (payload) => {
    if (
      payload.senderId !== props.currentUserId &&
      payload.conversationId === props.conversationId
    ) {
      typing.value = true;
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => (typing.value = false), 2000);
    }
  });

  if (supabase) {
    supabase
      .channel("messages-changes-frontend")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = normalize(payload.new);
          if (msg.conversationId !== props.conversationId) return;
          if (msg.id && deliveredIds.has(msg.id)) return;

          if (isMine(msg)) {
            const idx = [...pendingMap.values()].find(
              (i) =>
                messages.value[i]?.status === "sending" &&
                messages.value[i]?.content === msg.content
            );
            if (idx !== undefined && idx !== null) {
              messages.value[idx] = { ...msg, status: "sent" };
              deliveredIds.add(msg.id);
              scrollToBottom();
              return;
            }
          }
          messages.value.push({
            ...msg,
            status: isMine(msg) ? "sent" : undefined,
          });
          if (msg.id) deliveredIds.add(msg.id);
          scrollToBottom();
        }
      )
      .subscribe();
  }
});

function emitTyping() {
  const convId = props.conversationId;
  if (!convId) return;
  $socket.emit("typing", {
    conversationId: convId,
    senderId: props.currentUserId,
  });
}

async function sendMessage() {
  const text = message.value.trim();
  if (!text) return;

  loading.value = true;

  try {
    let convId = props.conversationId;

    // Tạo conversation nếu chưa có
    if (!convId) {
      const conv = await $fetch("/conversations/direct", {
        method: "POST",
        baseURL: config.public.apiBase,
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          "Content-Type": "application/json",
        },
        body: { userId: props.currentUserId, partnerId: partnerId.value },
      });
      convId = conv.id;

      emit("update:conversationId", convId);
      $socket.emit("join-conversation", convId);
    }

    // Optimistic push
    const tempId = `tmp_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const optimistic = normalize({
      tempId,
      conversationId: convId,
      senderId: props.currentUserId,
      content: text,
      status: "sending",
      createdAt: new Date().toISOString(),
    });
    messages.value.push(optimistic);
    pendingMap.set(tempId, messages.value.length - 1);
    scrollToBottom();

    // Gọi API -> trả về message thật
    const saved = await $fetch(`/conversations/${convId}/messages`, {
      method: "POST",
      baseURL: config.public.apiBase,
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        "Content-Type": "application/json",
      },
      body: { senderId: props.currentUserId, content: text },
    });
    const savedMsg = normalize(saved);

    // Replace pending bằng message thật (tránh chờ socket)
    const pendingIdx = pendingMap.get(tempId);
    if (pendingIdx !== undefined) {
      messages.value[pendingIdx] = { ...savedMsg, status: "sent" };
      pendingMap.delete(tempId);
      if (savedMsg.id) deliveredIds.add(savedMsg.id);
    }

    message.value = "";
    scrollToBottom();
  } catch (err) {
    console.error("Lỗi gửi message:", err);

    const last = messages.value[messages.value.length - 1];
    if (last && last.status === "sending") last.status = "error";
  } finally {
    loading.value = false;
  }
}

const partnerId = computed(
  () => props.partner?.id || props.partner?._id || null
);
</script>

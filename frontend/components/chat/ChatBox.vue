<template>
  <div
    v-show="partner || conversation"
    class="fixed bottom-6 right-6 w-96 h-[520px] bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col z-40 overflow-hidden"
  >
    <!-- Header -->
    <div class="flex items-center p-3 border-b border-gray-200 bg-gray-100">
      <UserCircleIcon class="w-8 h-8 text-gray-500 mr-2" />
      <span class="font-semibold text-gray-700 flex-1">
        {{ partner?.fullName || conversation?.name || "Chat" }}
      </span>
      <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
        ✕
      </button>
    </div>

    <!-- Messages -->
    <div
      ref="scrollWrap"
      class="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50"
    >
      <div v-if="joinNotice" class="text-xs text-green-600 mb-2">
        {{ joinNotice }}
      </div>

      <!-- Tin nhắn -->
      <div
        v-for="msg in messages"
        :key="msg.id || msg.tempId"
        class="w-full flex items-start gap-2"
        :class="isMine(msg) ? 'justify-end' : 'justify-start'"
      >
        <!-- Avatar -->
        <div v-if="!isMine(msg)" class="flex-shrink-0">
          <UserCircleIcon class="w-8 h-8 text-gray-400" />
        </div>

        <!-- Nội dung -->
        <div
          :class="[
            'flex flex-col max-w-[80%]',
            isMine(msg) ? 'items-end' : 'items-start',
          ]"
        >
          <!-- Tên người gửi (chỉ hiện cho người khác trong group) -->
          <div
            v-if="!isMine(msg) && conversation?.type === 'group'"
            class="text-xs text-gray-500 mb-0.5"
          >
            {{ msg.senderFullName || "Người dùng" }}
          </div>

          <!-- Bong bóng -->
          <div
            :class="[
              'inline-block px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words break-all leading-relaxed',
              isMine(msg)
                ? 'bg-gray-400 text-white rounded-br-none'
                : 'bg-gray-200 text-gray-800 rounded-bl-none',
            ]"
          >
            <div v-html="formatMessage(msg.content)"></div>

            <!-- Trạng thái gửi -->
            <div
              v-if="isMine(msg) && msg.status"
              class="mt-1 text-[11px] opacity-80 text-right"
            >
              <span v-if="msg.status === 'sending'">Đang gửi…</span>
              <span v-else-if="msg.status === 'sent'">Đã gửi</span>
              <span v-else-if="msg.status === 'error'">Lỗi, thử lại</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Typing -->
    <div v-if="typing" class="px-3 py-2 text-gray-500 text-sm italic">
      {{ typing }}
    </div>

    <!-- Hiển thị trạng thái đã xem -->
    <!-- Hiển thị trạng thái đã xem -->
    <div
      v-if="Object.keys(visibleReaders).length"
      class="flex items-center justify-end gap-2 px-3 py-1 text-xs text-gray-500"
    >
      <template v-if="conversation?.type === 'direct'">
        <div
          class="flex items-center gap-2 bg-gray-100 rounded-full px-2 py-0.5 border border-gray-200"
        >
          <UserCircleIcon class="w-4 h-4 text-gray-400" />
          <span class="font-medium text-gray-600">
            {{ Object.values(visibleReaders)[0]?.fullName || "Người kia" }}
          </span>
          <span class="text-[11px] text-gray-400">đã xem</span>
        </div>
      </template>

      <template v-else>
        <div
          class="flex items-center gap-1 flex-wrap justify-end text-gray-500 text-[12px]"
        >
          <span
            v-for="(info, uid) in visibleReaders"
            :key="uid"
            class="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-0.5 border border-gray-200"
          >
            <UserCircleIcon class="w-3.5 h-3.5 text-gray-400" />
            <span class="font-medium text-gray-600">
              {{ info.fullName.split(" ")[0] }}
            </span>
            <span class="text-[11px] text-gray-400">đã xem</span>
          </span>
        </div>
      </template>
    </div>

    <!-- Input -->
    <div class="flex items-end p-3 border-t border-gray-200 bg-white">
      <textarea
        v-model="message"
        @focus="markAsRead"
        @input="emitTyping"
        @keydown.enter.exact.prevent="sendMessage"
        @keydown.shift.enter="message += '\n'"
        placeholder="Aa..."
        rows="1"
        class="flex-1 resize-none px-3 py-2 rounded-2xl border border-gray-300 mr-2 focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm max-h-32 overflow-y-auto"
        style="line-height: 1.5"
      ></textarea>

      <button
        @click="sendMessage"
        :disabled="loading || !message.trim()"
        class="flex items-center justify-center w-10 h-10 rounded-full bg-black text-white hover:bg-gray-800 disabled:bg-gray-400 transition"
      >
        <PaperAirplaneIcon class="w-5 h-5" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { UserCircleIcon, PaperAirplaneIcon } from "@heroicons/vue/24/outline";
import supabase from "@/plugins/supabase";
import { useAuthStore } from "@/stores/auth";
import { useChatStore } from "@/stores/chat";

const chatStore = useChatStore();
const joinNotice = ref("");
const router = useRouter();
const readStatus = ref({}); // { userId: { lastReadAt, fullName } }

function formatMessage(content) {
  if (!content) return "";
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  return content.replace(urlRegex, (url) => {
    // Nếu là link mời nhóm
    if (url.includes("/invite/")) {
      const token = url.split("/invite/")[1];
      return `<a href='#' data-token='${token}' class='invite-link underline text-blue-700 break-all'>${url}</a>`;
    }
    return `<a href='${url}' target='_blank' class='underline text-blue-700 break-all'>${url}</a>`;
  });
}

const props = defineProps({
  conversationId: String,
  partner: Object, // direct chat
  conversation: Object, // group chat
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

const deliveredIds = new Set();
const pendingMap = new Map();

const isMine = (m) =>
  String(m?.senderId ?? m?.sender_id ?? "") ===
  String(props.currentUserId ?? "");

const normalize = (raw) => ({
  id: raw.id ?? null,
  tempId: raw.tempId ?? null,
  conversationId: raw.conversationId ?? raw.conversation_id ?? null,
  senderId: raw.senderId ?? raw.sender_id ?? null,
  senderFullName: raw.senderFullName ?? raw.sender_name ?? null,
  content: raw.content ?? "",
  status: raw.status ?? undefined,
  createdAt: raw.createdAt ?? raw.created_at ?? null,
});

const scrollWrap = ref(null);
function scrollToBottom() {
  requestAnimationFrame(() => {
    const el = scrollWrap.value;
    if (el) el.scrollTop = el.scrollHeight;
  });
}

const lastMsgAt = computed(() => {
  const last = messages.value[messages.value.length - 1];
  return last?.createdAt ? new Date(last.createdAt).getTime() : 0;
});

const visibleReaders = computed(() => {
  const entries = Object.entries(readStatus.value);
  return Object.fromEntries(
    entries.filter(([_, info]) => {
      const t = info?.lastReadAt ? new Date(info.lastReadAt).getTime() : 0;
      return t >= lastMsgAt.value; // chỉ hiện khi đã đọc sau tin cuối
    })
  );
});

function handleScroll() {
  const el = scrollWrap.value;
  if (!el || !props.conversationId) return;

  // // Nếu user gần cuối khung chat (đọc hết)
  // const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
  // if (nearBottom) {
  //   // Emit socket thông báo "đã đọc"
  //   $socket.emit("mark-as-read", {
  //     conversationId: props.conversationId,
  //     userId: props.currentUserId,
  //   });
  // }
}

async function loadMessagesForConversation(convId) {
  messages.value = [];
  deliveredIds.clear();
  pendingMap.clear();
  console.log(
    "📤 gửi message",
    convId,
    props.conversationId,
    props.conversation
  );
  if (!convId) return;

  try {
    emit("update:conversationId", convId);
    await nextTick(); // đảm bảo prop kịp cập nhật lại từ parent

    const data = await $fetch(`/messages/${convId}`, {
      method: "GET",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    const norm = data.map(normalize);
    norm.forEach((m) => m.id && deliveredIds.add(m.id));
    messages.value = norm;
    scrollToBottom();

    // console.log(" auto emit mark-as-read on load", convId);
    // $socket.emit("mark-as-read", {
    //   conversationId: convId,
    //   userId: props.currentUserId,
    // });
  } catch (e) {
    console.error("Lỗi load messages:", e);
  }
  $socket.emit("join-conversation", convId);
}

watch(
  () => props.conversationId,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      loadMessagesForConversation(newId);
      $socket.emit("join-conversation", newId);
    }
  },
  { immediate: true }
);

watch(
  () => props.partner,
  async (partner) => {
    if (partner && !props.conversationId) {
      try {
        const conv = await $fetch("/conversations/direct", {
          method: "POST",
          baseURL: config.public.apiBase,
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
            "Content-Type": "application/json",
          },
          body: {
            userId: props.currentUserId,
            partnerId: partner.id,
          },
        });
        emit("update:conversationId", conv.id);
        await loadMessagesForConversation(conv.id);
        $socket.emit("join-conversation", conv.id);
      } catch (err) {
        console.error("Không thể lấy hoặc tạo conversation:", err);
      }
    }
  },
  { immediate: true }
);

// Socket listeners
onMounted(() => {
  $socket.on("message", (raw) => {
    const msg = normalize(raw);
    if (msg.conversationId !== props.conversationId) return;
    if (msg.id && deliveredIds.has(msg.id)) return;

    if (isMine(msg)) {
      const idx = [...pendingMap.values()].find(
        (i) =>
          messages.value[i]?.status === "sending" &&
          messages.value[i]?.content === msg.content
      );
      if (idx !== undefined) {
        messages.value[idx] = { ...msg, status: "sent" };
        deliveredIds.add(msg.id);
        scrollToBottom();
        return;
      }
    }

    messages.value.push({ ...msg, status: isMine(msg) ? "sent" : undefined });
    msg.id && deliveredIds.add(msg.id);
    scrollToBottom();

    // reset trạng thái đã đọc
    readStatus.value = {};
  });

  $socket.on("typing", (payload) => {
    if (
      payload.senderId !== props.currentUserId &&
      payload.conversationId === props.conversationId
    ) {
      // Tìm tên từ cache
      const partner =
        props.partner ||
        (window.__users
          ? window.__users.find((u) => u.id === payload.senderId)
          : null);

      typing.value = partner?.fullName
        ? `${partner.fullName} đang nhập...`
        : "Ai đó đang nhập...";

      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => (typing.value = false), 2000);
    }
  });

  $socket.on("user-joined", (payload) => {
    if (payload.conversationId === props.conversationId && payload.fullName) {
      joinNotice.value = `${payload.fullName} vừa tham gia nhóm!`;
      setTimeout(() => (joinNotice.value = ""), 4000);
    }
  });

  if (supabase) {
    let supabaseChannel;
    supabaseChannel = supabase
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
            if (idx !== undefined) {
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
          msg.id && deliveredIds.add(msg.id);
          scrollToBottom();
        }
      )
      .subscribe();
  }

  const chatEl = scrollWrap.value;
  chatEl?.addEventListener("click", (e) => {
    const target = e.target;
    if (target.classList.contains("invite-link")) {
      e.preventDefault();
      const token = target.dataset.token;
      if (token) {
        router.push(`/invite/${token}`);
      }
    }
  });

  $socket.on(
    "read-updated",
    ({ conversationId, userId, fullName, lastReadAt }) => {
      if (conversationId !== props.conversationId) return;
      if (userId === props.currentUserId) return;
      readStatus.value[userId] = {
        lastReadAt,
        fullName: fullName || "Người dùng",
      };
    }
  );

  nextTick(() => {
    scrollWrap.value?.addEventListener("scroll", handleScroll);
  });
});

function emitTyping() {
  if (!props.conversationId) return;
  $socket.emit("typing", {
    conversationId: props.conversationId,
    senderId: props.currentUserId,
  });
}

function markAsRead() {
  if (!props.conversationId || !props.currentUserId) return;

  console.log("📩 mark-as-read triggered (focus input)");
  $socket.emit("mark-as-read", {
    conversationId: props.conversationId,
    userId: props.currentUserId,
  });

  // Reset badge nếu đây là conversation hiện tại
  chatStore.clearUnread();
}

async function sendMessage() {
  const text = message.value.trim();
  if (!text) return;
  loading.value = true;

  try {
    let convId = props.conversationId;

    // Nếu direct chưa có conversation -> tạo mới
    if (!convId && props.partner) {
      const conv = await $fetch("/conversations/direct", {
        method: "POST",
        baseURL: config.public.apiBase,
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          "Content-Type": "application/json",
        },
        body: {
          userId: props.currentUserId,
          partnerId: props.partner?.id || props.partner?._id,
        },
      });
      convId = conv.id;
      emit("update:conversationId", convId);
      await loadMessagesForConversation(convId);
      $socket.emit("join-conversation", convId);
    }

    // Nếu là group thì props.conversation luôn có sẵn
    if (!convId && props.conversation) {
      convId = props.conversation.id;
    }

    if (!convId) throw new Error("Không xác định được conversationId");

    // Optimistic UI
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

    // Gọi API lưu message
    const saved = await $fetch(`/messages/${convId}`, {
      method: "POST",
      baseURL: config.public.apiBase,
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        "Content-Type": "application/json",
      },
      body: { senderId: props.currentUserId, content: text },
    });
    const savedMsg = normalize(saved);

    const pendingIdx = pendingMap.get(tempId);
    if (pendingIdx !== undefined) {
      messages.value[pendingIdx] = { ...savedMsg, status: "sent" };
      pendingMap.delete(tempId);
      savedMsg.id && deliveredIds.add(savedMsg.id);
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
onBeforeUnmount(() => {
  $socket.off("message");
  $socket.off("typing");
  $socket.off("user-joined");
  $socket.off("read-updated");

  if (supabaseChannel) supabaseChannel.unsubscribe();

  messages.value = [];
  typing.value = false;
  readStatus.value = {};
});
</script>

<template>
  <div
    v-if="partner || conversation"
    class="fixed bottom-6 right-6 w-96 h-[520px] bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col z-40 overflow-hidden"
  >
    <!-- Header -->
    <div class="flex items-center p-3 border-b border-gray-200 bg-gray-100">
      <UserCircleIcon class="w-8 h-8 text-gray-500 mr-2" />

      <!-- Tên nhóm + trạng thái -->
      <div class="flex flex-col flex-1">
        <div class="flex items-center">
          <span class="font-semibold text-gray-800 mr-2">
            {{ partner?.fullName || conversation?.name || "Chat" }}
          </span>

          <!-- Icon xem chi tiết -->
          <InformationCircleIcon
            v-if="isGroupChat"
            class="w-5 h-5 text-gray-500 hover:text-gray-700 cursor-pointer"
            @click="openGroupDetail"
          />
        </div>

        <!-- Hiển thị trạng thái -->
        <p v-if="groupStatusText" class="text-xs text-gray-600 mt-0.5">
          {{ groupStatusText }}
        </p>
      </div>

      <!-- Nút đóng -->
      <button
        @click="$emit('close')"
        class="text-gray-400 hover:text-gray-600 ml-2"
      >
        ✕
      </button>
    </div>

    <!-- Gợi ý hành động cho user hiện tại -->
    <!-- Chưa chọn -->
    <div
      v-if="
        currentUserMember && !currentUserMember.hasChosen && isGroupOrderLocked
      "
      class="mx-3 mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[12px] flex items-center justify-between"
    >
      <span class="font-medium">Bạn chưa chọn sản phẩm.</span>
      <button
        @click="openChooseModal"
        class="px-2.5 py-1 bg-amber-500 text-white rounded-md text-[11px] hover:bg-amber-600 transition"
      >
        Chọn
      </button>
    </div>

    <!-- Đã chọn nhưng vẫn được phép sửa -->
    <div
      v-if="
        currentUserMember && currentUserMember.hasChosen && isGroupOrderLocked
      "
      class="mx-3 mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-[12px] flex items-center justify-between"
    >
      <span class="font-medium">Bạn đã chọn. Muốn chỉnh sửa?</span>
      <button
        @click="openChooseModal"
        class="px-2.5 py-1 bg-blue-600 text-white rounded-md text-[11px] hover:bg-blue-700 transition"
      >
        Sửa
      </button>
    </div>

    <!-- Messages -->
    <div
      ref="scrollWrap"
      class="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50"
    >
      <!-- Tin nhắn -->
      <div v-for="msg in messages" :key="msg.id || msg.tempId" class="w-full">
        <div
          v-if="msg.type === 'system'"
          class="w-full text-center text-[11px] text-gray-400 italic my-1"
        >
          {{ msg.content }}
        </div>
        <div
          v-else
          class="flex items-start gap-2"
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
              v-if="!isMine(msg) && isGroupChat"
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
    </div>

    <!-- Typing -->
    <div v-if="typing" class="px-3 py-2 text-gray-500 text-sm italic">
      {{ typing }}
    </div>

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
    <!-- Khung mua chung -->
    <div
      v-if="showGroupOrderBox"
      class="border-t border-gray-200 bg-gray-50 px-3 py-1.5 text-[11px] text-gray-700"
    >
      <!-- Header -->
      <div class="flex items-center justify-between mt-1">
        <span class="text-[10px] text-gray-500">
          {{ chosenCount }}/{{ totalMemberCount }} đã chọn
        </span>
        <div class="flex items-center gap-2">
          <button
            @click="toggleGroupBox"
            class="text-[10px] border border-gray-300 rounded-md px-2 py-0.5 hover:bg-gray-100 transition"
          >
            {{ groupBoxExpanded ? "Ẩn ▲" : "Chi tiết ▼" }}
          </button>
          <button
            v-if="
              isGroupChat &&
              groupDetail?.groupOrder?.status === 'locked' &&
              groupDetail?.groupOrder?.creatorId === currentUserId &&
              chosenCount === totalMemberCount
            "
            @click="checkoutGroupOrder"
            class="bg-black hover:bg-gray-800 text-white text-[10px] font-medium px-2.5 py-1 rounded-md transition"
          >
            Đặt đơn nhóm
          </button>
        </div>
      </div>

      <!-- Chi tiết -->
      <transition name="fade">
        <div v-if="groupBoxExpanded" class="mt-1">
          <div
            class="bg-white border border-gray-200 rounded-lg p-1.5 max-h-28 overflow-y-auto"
          >
            <table class="w-full text-[10px]">
              <thead>
                <tr class="text-gray-500 border-b">
                  <th class="py-0.5 text-left">Thành viên</th>
                  <th class="py-0.5 text-left">Sản phẩm</th>
                  <th class="py-0.5 text-right w-8">SL</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="m in groupMembersDisplay"
                  :key="m.userId"
                  :class="[
                    m.isCurrentUser ? 'bg-blue-50' : '',
                    'border-b last:border-0',
                  ]"
                >
                  <td class="py-0.5 pr-1">
                    <span class="font-medium text-gray-800">
                      {{ m.shortName }}
                      <span v-if="m.isCreator" class="text-[9px] text-gray-400"
                        >(trưởng)</span
                      >
                      <span
                        v-if="m.isCurrentUser"
                        class="ml-1 text-[9px] text-blue-500"
                        >(bạn)</span
                      >
                    </span>
                  </td>
                  <td class="py-0.5 pr-1 text-gray-600 truncate max-w-[80px]">
                    <span v-if="m.hasChosen">{{
                      m.variantText || "Đã chọn"
                    }}</span>
                    <span v-else class="text-gray-400 italic">Chưa</span>
                  </td>
                  <td class="py-0.5 text-right">
                    <span
                      v-if="m.hasChosen"
                      class="text-green-600 font-medium"
                      >{{ m.quantity }}</span
                    >
                    <span v-else class="text-gray-400">-</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </transition>

      <!-- Nút Đặt đơn nhóm - chỉ hiện với trưởng nhóm -->
      <div
        v-if="
          isGroupChat &&
          groupDetail?.groupOrder?.creatorId === currentUserId &&
          groupDetail?.groupOrder?.status === 'locked' &&
          chosenCount === totalMemberCount
        "
        class="flex justify-center mt-2 mb-2"
      ></div>
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
    <GroupOrderDetailModal
      v-if="showGroupDetail"
      :open="showGroupDetail"
      :groupOrder="groupDetail?.groupOrder"
      :product="groupDetail?.product"
      :coupon="groupDetail?.coupon"
      :members="groupDetail?.members"
      :inviteToken="groupDetail?.inviteToken"
      @close="showGroupDetail = false"
    />
    <GroupOrderChooseModal
      v-if="showChooseModal && groupDetail && groupDetail.product"
      :open="showChooseModal"
      :groupOrderId="groupDetail.groupOrder.id"
      :product="groupDetail.product"
      @close="showChooseModal = false"
      @chosen="handleChosen"
    />
  </div>
</template>

<script setup>
import {
  UserCircleIcon,
  PaperAirplaneIcon,
  InformationCircleIcon,
} from "@heroicons/vue/24/outline";
import supabase from "@/plugins/supabase";
import { useAuthStore } from "@/stores/auth";
import { useChatStore } from "@/stores/chat";
import GroupOrderDetailModal from "../modals/groupOrder/GroupOrderDetailModal.vue";
import GroupOrderChooseModal from "../modals/groupOrder/GroupOrderChooseModal.vue";

const chatStore = useChatStore();
const router = useRouter();
const readStatus = ref({}); // { userId: { lastReadAt, fullName } }
const showGroupDetail = ref(false);
const groupDetail = ref(null);
const showChooseModal = ref(false);
let supabaseChannel;

const isGroupChat = computed(
  () => props.conversation?.type === "group" || !!groupDetail.value?.groupOrder
);

const groupBoxExpanded = ref(false);
function openChooseModal() {
  if (!groupDetail.value?.product) {
    console.warn("groupDetail chưa có product, chặn mở modal");
    return;
  }
  showChooseModal.value = true;
}

const showGroupBox = ref(false);
function toggleGroupBox() {
  showGroupBox.value = !showGroupBox.value;
  groupBoxExpanded.value = !groupBoxExpanded.value;
}

const groupStatusText = computed(() => {
  const s = groupDetail.value?.groupOrder?.status;
  return s ? statusText(s) : "";
});

const showGroupOrderBox = computed(() => {
  return !!groupDetail.value?.groupOrder;
});

// const groupStatusClass = computed(() => {
//   const s = groupDetail.value?.groupOrder?.status;
//   if (s === "pending") return "text-yellow-600";
//   if (s === "locked") return "text-green-600";
//   if (s === "ordering") return "text-blue-600";
//   if (s === "completed") return "text-gray-600";
//   if (s === "cancelled") return "text-red-500";
//   return "text-gray-500";
// });
function handleChosen(data) {
  console.log("User đã chọn:", data);
}
const isGroupOrderLocked = computed(
  () => groupDetail.value?.groupOrder?.status === "locked"
);

const groupMembers = computed(() => groupDetail.value?.members || []);

// tìm member tương ứng với user hiện tại
const currentUserMember = computed(() =>
  groupMembers.value.find(
    (m) => String(m.userId) === String(props.currentUserId)
  )
);

const totalMemberCount = computed(() => groupMembers.value.length);

const chosenCount = computed(
  () => groupMembers.value.filter((m) => m.hasChosen).length
);

// Chuẩn hóa dữ liệu hiển thị
const groupMembersDisplay = computed(() => {
  return groupMembers.value.map((m) => {
    const fullName = m.fullName || m.name || "Người dùng";
    const shortName = fullName.split(" ").slice(-1)[0]; // lấy tên cuối

    // backend nên trả sẵn colorName / sizeName; nếu không có thì fallback
    const color = m.colorName || m.color || "";
    const size = m.sizeName || m.size || "";
    let variantText = "";

    if (m.hasChosen) {
      if (color || size) {
        variantText = [color, size].filter(Boolean).join(" / ");
      } else {
        variantText = "Đã chọn";
      }
    }

    return {
      userId: m.userId,
      fullName,
      shortName,
      hasChosen: !!m.hasChosen,
      quantity: m.quantity ?? null,
      variantText,
      isCreator:
        String(m.userId) ===
        String(groupDetail.value?.groupOrder?.creatorId || ""),
      isCurrentUser: String(m.userId) === String(props.currentUserId),
    };
  });
});

function formatMessage(content) {
  if (!content) return "";
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  return content.replace(urlRegex, (url) => {
    if (url.includes("/invite/")) {
      const token = url.split("/invite/")[1];
      return `<a
        href="/invite/${token}"
        data-token="${token}"
        class="invite-link underline text-blue-700 break-all"
      >${url}</a>`;
    }
    return `<a href="${url}" target="_blank" class="underline text-blue-700 break-all">${url}</a>`;
  });
}

async function checkoutGroupOrder() {
  const groupOrder = groupDetail.value?.groupOrder;
  if (!groupOrder?.id) return;

  // Nếu nhóm đã được đặt hoặc hoàn tất -> chặn
  if (["ordering", "completed"].includes(groupOrder.status)) {
    alert("Nhóm này đã được đặt đơn hoặc đã hoàn tất.");
    return;
  }

  // Nếu nhóm chưa đủ thành viên -> chặn
  if (chosenCount.value < totalMemberCount.value) {
    alert("Nhóm chưa đủ thành viên để đặt đơn.");
    return;
  }

  //  Nếu không phải trưởng nhóm -> chặn
  if (groupOrder.creatorId !== auth.user.id) {
    alert("Chỉ trưởng nhóm mới có thể đặt đơn.");
    return;
  }

  //  Xác nhận đặt đơn
  const ok = confirm("Xác nhận đặt đơn nhóm cho tất cả thành viên?");
  if (!ok) return;

  try {
    const res = await $fetch(`/group-orders/${groupOrder.id}/checkout`, {
      method: "PATCH",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    alert("Đặt đơn nhóm thành công!");
    groupDetail.value.groupOrder.status = "ordering"; // cập nhật local
  } catch (err) {
    console.error("Lỗi khi đặt đơn nhóm:", err);
    alert(err?.data?.error || "Đặt đơn thất bại, vui lòng thử lại.");
  }
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

const normalize = (raw) => {
  const type =
    raw.type ||
    raw.message_type ||
    (raw.senderId === "00000000-0000-0000-0000-000000000000"
      ? "system"
      : "text");

  return {
    id: raw.id ?? null,
    tempId: raw.tempId ?? null,
    conversationId: raw.conversationId ?? raw.conversation_id ?? null,
    senderId: raw.senderId ?? raw.sender_id ?? null,
    senderFullName:
      raw.senderFullName ?? raw.sender_full_name ?? raw.sender_name ?? null,

    content: raw.content ?? "",
    status: raw.status ?? undefined,
    type,
    createdAt: raw.createdAt ?? raw.created_at ?? null,
  };
};

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
}

async function loadMessagesForConversation(convId) {
  messages.value = [];
  deliveredIds.clear();
  pendingMap.clear();
  // console.log("gửi message", convId, props.conversationId, props.conversation);
  if (!convId) return;

  try {
    emit("update:conversationId", convId);
    await nextTick();

    const data = await $fetch(`/messages/${convId}`, {
      method: "GET",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    const norm = data.map(normalize);
    norm.forEach((m) => m.id && deliveredIds.add(m.id));
    messages.value = norm;
    scrollToBottom();
  } catch (e) {
    console.error("Lỗi load messages:", e);
  }
  $socket.emit("join-conversation", convId);
}

watch(
  () => props.conversationId,
  async (newId) => {
    if (!newId) return;
    readStatus.value = {};
    await loadMessagesForConversation(newId);
    $socket.emit("join-conversation", newId);

    try {
      const res = await $fetch(`/group-orders/${newId}`, {
        method: "GET",
        baseURL: config.public.apiBase,
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      console.log(">>> group order API result:", res);
      if (res?.groupOrder) groupDetail.value = res;
      else groupDetail.value = null;
    } catch {
      groupDetail.value = null;
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
  if (props.conversationId) {
    $socket.emit("join-conversation", props.conversationId);
  }

  $socket.on("message", (raw) => {
    const msg = normalize({
      ...raw,
      senderFullName:
        raw.senderFullName || raw.sender_full_name || raw.sender_name,
    });

    console.log("Raw message:", raw);
    console.log("senderFullName:", msg.senderFullName);
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
      const name =
        payload.senderFullName ||
        props.partner?.fullName ||
        window.__users?.find((u) => u.id === payload.senderId)?.fullName ||
        "Người dùng";

      typing.value = `${name} đang nhập...`;

      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => (typing.value = false), 2000);
    }
  });

  $socket.on("user-joined", async (payload) => {
    if (payload.conversationId !== props.conversationId) return;

    // tin nhan he thong
    messages.value.push({
      id: `sys_${Date.now()}`,
      content: `${payload.fullName || "Người dùng"} đã tham gia nhóm`,
      senderFullName: "system",
      type: "system",
      createdAt: new Date().toISOString(),
    });
    scrollToBottom();

    if (isGroupChat.value) {
      try {
        const res = await $fetch(`/group-orders/${props.conversationId}`, {
          method: "GET",
          baseURL: config.public.apiBase,
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        });
        groupDetail.value = res;
      } catch (err) {
        console.error("Không thể reload group-order:", err);
      }
    }
  });

  const chatEl = scrollWrap.value;
  chatEl?.addEventListener("click", (e) => {
    const link = e.target.closest(".invite-link");
    if (link && link.dataset.token) {
      e.preventDefault();
      router.push(`/invite/${link.dataset.token}`);
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

  $socket.on("group-order-choice", (payload) => {
    if (payload.conversationId !== props.conversationId) return;

    if (groupDetail.value && groupDetail.value.members) {
      const idx = groupDetail.value.members.findIndex(
        (m) => String(m.userId) === String(payload.userId)
      );
      if (idx !== -1) {
        groupDetail.value.members[idx] = {
          ...groupDetail.value.members[idx],
          hasChosen: true,
          quantity: payload.quantity,
        };
      }
      groupDetail.value = JSON.parse(JSON.stringify(groupDetail.value));
    }
  });

  // lang nghe su kien chuyen trang thai nhom sang cancelled
  $socket.on("group-order-cancelled", (payload) => {
    if (payload.conversationId !== props.conversationId) return;

    if (groupDetail.value?.groupOrder) {
      groupDetail.value.groupOrder.status = "cancelled";
    }

    scrollToBottom();
  });

  $socket.on("user-left", async (payload) => {
    if (payload.conversationId !== props.conversationId) return;
    scrollToBottom();

    // reload member list trong groupDetail
    if (isGroupChat.value) {
      try {
        const res = await $fetch(`/group-orders/${props.conversationId}`, {
          method: "GET",
          baseURL: config.public.apiBase,
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        });
        groupDetail.value = res;
      } catch (err) {
        console.error("Không thể reload group detail sau khi rời:", err);
      }
    }
  });

  $socket.on("force-close-chat", (payload) => {
    if (payload.conversationId === props.conversationId) {
      emit("close");
    }
  });

  $socket.on("group-deleted", (payload) => {
    if (payload.conversationId !== props.conversationId) return;
    scrollToBottom();

    // đóng group box
    groupDetail.value = null;

    alert("Nhóm đã giải tán");
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

  // console.log("mark-as-read triggered (focus input)");
  $socket.emit("mark-as-read", {
    conversationId: props.conversationId,
    userId: props.currentUserId,
  });

  window.dispatchEvent(
    new CustomEvent("mark-as-read", {
      detail: { conversationId: props.conversationId },
    })
  );

  // Reset badge nếu đây là conversation hiện tại
  chatStore.clearUnread();
}

function statusText(status) {
  const map = {
    pending: "Đang mở",
    locked: "Đã đủ thành viên",
    ordering: "Đang đặt hàng",
    completed: "Đã hoàn tất",
    cancelled: "Đã huỷ",
  };
  return map[status] || "";
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
      senderFullName: auth.user?.fullName || "Bạn",
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

async function openGroupDetail() {
  console.log("CLICK DETAIL", props.conversation);

  if (!isGroupChat.value || !props.conversation?.id) {
    console.warn("Không phải nhóm, bỏ qua");
    return;
  }

  try {
    console.log("FETCHING...");
    const res = await $fetch(
      `/group-orders/${props.conversation.id}?type=group`,
      {
        method: "GET",
        baseURL: config.public.apiBase,
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
        },
      }
    );

    console.log("Group detail fetched:", res);
    groupDetail.value = res;
    showGroupDetail.value = true;
  } catch (err) {
    console.error("Không thể lấy thông tin nhóm:", err);
  }
}

onBeforeUnmount(() => {
  $socket.off("message");
  $socket.off("typing");
  $socket.off("user-joined");
  $socket.off("read-updated");
  $socket.off("group-order-choice");
  $socket.off("user-left");
  $socket.off("group-deleted");
  $socket.off("group-order-cancelled");

  if (supabaseChannel) supabaseChannel.unsubscribe();

  messages.value = [];
  typing.value = false;
  readStatus.value = {};
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  max-height: 0;
  transform: scaleY(0.9);
}
</style>

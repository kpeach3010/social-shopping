<template>
  <transition name="fade">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div class="absolute inset-0 bg-black/40" @click="$emit('close')"></div>
      <div
        class="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden"
      >
        <!-- Header -->
        <div
          class="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between"
        >
          <h3 class="text-sm font-semibold text-gray-900">
            Bình luận bài viết
          </h3>
          <button
            class="p-1 rounded hover:bg-gray-200"
            @click="$emit('close')"
            aria-label="Đóng"
          >
            <svg
              class="w-5 h-5 text-gray-600"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <!-- Post -->
          <div v-if="post" class="bg-white rounded border border-gray-200">
            <div class="px-3 py-2 border-b border-gray-200 bg-gray-50">
              <div class="flex items-center gap-2">
                <div
                  class="w-8 h-8 rounded-full bg-linear-to-br from-gray-700 to-gray-900 flex items-center justify-center"
                >
                  <svg
                    class="w-5 h-5 text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-3.866 0-7 2.239-7 5v2h14v-2c0-2.761-3.134-5-7-5z"
                    />
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-xs text-gray-900 truncate">
                    {{ post.post.authorName || "Người dùng" }}
                  </p>
                  <p class="text-[10px] text-gray-500">
                    {{ formatDate(post.post.createdAt) }}
                  </p>
                </div>
              </div>
            </div>
            <div class="px-3 py-2">
              <div
                class="text-xs text-gray-900 whitespace-pre-wrap relative break-words"
                :class="{ 'max-h-24 overflow-hidden': !showFullPost }"
              >
                <div v-html="post.post.content"></div>
                <div
                  v-if="!showFullPost && post.post?.content?.length > 200"
                  class="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-b from-transparent to-white"
                ></div>
              </div>
              <button
                v-if="post.post?.content?.length > 200"
                class="mt-1 text-[11px] font-semibold text-gray-700 hover:text-black"
                @click="showFullPost = !showFullPost"
              >
                {{ showFullPost ? "Thu gọn" : "Xem thêm" }}
              </button>

              <div
                v-if="post.media?.length"
                class="mt-2 grid grid-cols-2 gap-1"
              >
                <div
                  v-for="(m, idx) in displayMedia"
                  :key="m.id || idx"
                  class="relative bg-white cursor-pointer"
                  @click="openGallery(idx)"
                >
                  <video
                    v-if="isVideo(m.postFileUrl)"
                    :src="m.postFileUrl"
                    class="w-full h-40 object-contain bg-white"
                  />
                  <img
                    v-else
                    :src="m.postFileUrl"
                    class="w-full h-40 object-contain"
                  />
                  <div
                    v-if="idx === 3 && extraMediaCount > 0"
                    class="absolute inset-0 bg-black/50 text-white flex items-center justify-center text-sm font-semibold"
                  >
                    +{{ extraMediaCount }}
                  </div>
                </div>
              </div>

              <div class="mt-3 flex items-center justify-center gap-2 text-sm">
                <button
                  class="px-3 py-1.5 rounded-full border border-gray-200 shadow-sm bg-white hover:bg-gray-50 flex items-center gap-2 disabled:opacity-60"
                  :class="postUserHasLiked ? 'text-blue-600' : 'text-gray-800'"
                  @click="togglePostLike"
                  :disabled="likingPost"
                >
                  <HandThumbUpIcon
                    class="w-4 h-4"
                    :class="
                      postUserHasLiked ? 'text-blue-600' : 'text-slate-700'
                    "
                  />
                  <span class="font-semibold">Thích</span>
                  <span class="text-gray-500">({{ postLikes }})</span>
                </button>

                <button
                  class="px-3 py-1.5 rounded-full border border-gray-200 shadow-sm bg-white hover:bg-gray-50 flex items-center gap-2 text-gray-800"
                  type="button"
                  disabled
                >
                  <ChatBubbleLeftEllipsisIcon class="w-4 h-4 text-slate-700" />
                  <span class="font-semibold">Bình luận</span>
                  <span class="text-gray-500">({{ postCommentCount }})</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Comments -->
          <div>
            <h4 class="text-xs font-semibold text-gray-700 mb-2">Bình luận</h4>
            <div v-if="loadingComments" class="py-4 text-center">
              <div
                class="animate-spin rounded-full h-6 w-6 border-b-2 border-black mx-auto"
              ></div>
            </div>
            <div v-else>
              <div v-if="comments.length === 0" class="text-xs text-gray-500">
                Chưa có bình luận nào.
              </div>
              <div v-else class="space-y-3">
                <div
                  v-for="item in threadedComments"
                  :key="item.comment.id"
                  class="flex items-start gap-2"
                  :style="{ marginLeft: `${item.depth * 16}px` }"
                >
                  <div
                    class="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-800 text-[11px] font-bold"
                  >
                    {{ initial(item.comment.authorName) }}
                  </div>
                  <div class="flex-1">
                    <div
                      class="bg-gray-100 rounded px-3 py-2"
                      :class="{ 'border-l-2 border-blue-200': item.depth > 0 }"
                    >
                      <p
                        class="text-[11px] font-semibold text-gray-900 leading-tight"
                      >
                        {{ item.comment.authorName || "Người dùng" }}
                      </p>
                      <p
                        class="text-[10px] uppercase text-gray-500"
                        v-if="item.depth > 0"
                      >
                        Trả lời {{ parentAuthor(item.comment.parentCommentId) }}
                      </p>
                      <p
                        class="text-xs text-gray-900 whitespace-pre-wrap break-words"
                      >
                        {{ item.comment.content }}
                      </p>
                    </div>
                    <div
                      class="mt-1 flex items-center gap-3 text-[10px] text-gray-500"
                    >
                      <span>{{ formatDate(item.comment.createdAt) }}</span>
                      <button
                        class="hover:text-gray-800"
                        :class="{
                          'text-blue-600 font-semibold':
                            item.comment.userHasLiked,
                        }"
                        @click="likeComment(item.comment)"
                      >
                        Thích ({{ item.comment.likeCount || 0 }})
                      </button>
                      <button
                        class="hover:text-gray-800"
                        @click="replyTo(item.comment)"
                      >
                        Trả lời
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Composer -->
          <div v-if="auth.isLoggedIn" class="border-t border-gray-200 pt-3">
            <div
              v-if="replyTargetName"
              class="flex items-center justify-between text-[11px] text-gray-700 mb-1"
            >
              <span>Đang trả lời {{ replyTargetName }}</span>
              <button
                class="px-2 py-0.5 rounded border border-gray-200 hover:bg-gray-100"
                @click="replyTargetId = null"
              >
                Hủy
              </button>
            </div>
            <div class="flex items-center gap-2">
              <textarea
                v-model="newContent"
                rows="2"
                placeholder="Viết bình luận..."
                class="flex-1 text-xs rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
              ></textarea>
              <button
                @click="submitComment"
                :disabled="submitting || !newContent.trim()"
                class="px-3 py-2 rounded bg-black text-white text-xs font-semibold disabled:opacity-60"
              >
                {{ submitting ? "Đang gửi..." : "Gửi" }}
              </button>
            </div>
            <p v-if="errorMsg" class="text-[11px] text-red-600 mt-1">
              {{ errorMsg }}
            </p>
          </div>
          <div v-else class="text-[11px] text-gray-500">
            Đăng nhập để bình luận.
          </div>
        </div>
      </div>
      <MediaGalleryModal
        v-if="post?.media?.length"
        :isOpen="galleryOpen"
        :mediaList="post.media"
        :startIndex="galleryStart"
        @close="galleryOpen = false"
      />
    </div>
  </transition>
</template>

<script setup>
import { ref, watch, computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import MediaGalleryModal from "@/components/MediaGalleryModal.vue";
import {
  HandThumbUpIcon,
  ChatBubbleLeftEllipsisIcon,
} from "@heroicons/vue/24/solid";

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  postId: { type: String, default: null },
});
const emit = defineEmits(["close"]);

const auth = useAuthStore();
const config = useRuntimeConfig();

const post = ref(null);
const comments = ref([]);
const loadingPost = ref(false);
const loadingComments = ref(false);
const newContent = ref("");
const submitting = ref(false);
const errorMsg = ref("");
const replyTargetId = ref(null);
const showFullPost = ref(false);
const galleryOpen = ref(false);
const galleryStart = ref(0);
const postLikes = ref(0);
const likingPost = ref(false);
const postCommentCount = ref(0);
const postUserHasLiked = ref(false);

const replyTargetName = computed(() => {
  const targetId = replyTargetId.value;
  if (!targetId) return "";
  const found = (comments.value || []).find((c) => c.id === targetId);
  return found?.authorName || "";
});

const displayMedia = computed(() => {
  if (!post.value?.media?.length) return [];
  return post.value.media.slice(0, 4);
});

const extraMediaCount = computed(() => {
  const total = post.value?.media?.length || 0;
  return total > 4 ? total - 4 : 0;
});

const openGallery = (idx) => {
  galleryStart.value = idx;
  galleryOpen.value = true;
};

const syncPostLikes = (data) => {
  const root = data || {};
  const p = root.post || {};
  postLikes.value = Number(root.likeCount ?? p.likeCount ?? 0) || 0;
  postUserHasLiked.value = root.userHasLiked ?? false;
};

const syncPostComments = (data) => {
  const root = data || {};
  const p = root.post || {};
  const raw = root.commentCount ?? p.commentCount ?? comments.value?.length;
  postCommentCount.value = Number(raw || 0);
};

const threadedComments = computed(() => {
  const nodes = new Map();
  const roots = [];
  for (const c of comments.value || []) {
    nodes.set(c.id, { comment: c, children: [] });
  }
  for (const c of comments.value || []) {
    const node = nodes.get(c.id);
    if (c.parentCommentId && nodes.has(c.parentCommentId)) {
      nodes.get(c.parentCommentId).children.push(node);
    } else {
      roots.push(node);
    }
  }
  const ordered = [];
  const walk = (list, depth = 0) => {
    for (const n of list) {
      ordered.push({ comment: n.comment, depth });
      if (n.children?.length) walk(n.children, depth + 1);
    }
  };
  walk(roots);
  return ordered;
});

const api = (url, options = {}) =>
  $fetch(url, { baseURL: config.public.apiBase, ...options });

watch(
  () => props.isOpen,
  async (open) => {
    if (open && props.postId) {
      errorMsg.value = ""; // Clear lỗi cũ
      await fetchPost();
      await fetchComments();
    }
  }
);

watch(
  () => props.postId,
  async (id) => {
    if (props.isOpen && id) {
      errorMsg.value = ""; // Clear lỗi cũ
      await fetchPost();
      await fetchComments();
    }
  }
);

const fetchPost = async () => {
  try {
    loadingPost.value = true;
    const res = await api(`/posts/${props.postId}`, {
      headers: auth.accessToken
        ? { Authorization: `Bearer ${auth.accessToken}` }
        : {},
    });
    post.value = res?.data || res || null;
    syncPostLikes(res?.data || res || null);
    syncPostComments(res?.data || res || null);
    errorMsg.value = ""; // Clear lỗi khi thành công
  } catch (err) {
    console.error("Fetch post error:", err);
    // Không set errorMsg ở đây để tránh hiển thị lỗi không cần thiết
  } finally {
    loadingPost.value = false;
  }
};

const fetchComments = async () => {
  try {
    loadingComments.value = true;
    const res = await api(`/posts/${props.postId}/comments`, {
      headers: auth.accessToken
        ? { Authorization: `Bearer ${auth.accessToken}` }
        : {},
    });
    comments.value = res?.data || res || [];
    postCommentCount.value = comments.value.length;
  } catch (err) {
    comments.value = [];
  } finally {
    loadingComments.value = false;
  }
};

const submitComment = async () => {
  if (!auth.accessToken) {
    errorMsg.value = "Vui lòng đăng nhập.";
    return;
  }
  if (!newContent.value.trim()) return;
  submitting.value = true;
  errorMsg.value = "";
  try {
    const res = await api(`/posts/${props.postId}/comments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      body: {
        content: newContent.value.trim(),
        parentCommentId: replyTargetId.value || null,
      },
    });
    // Refresh list
    newContent.value = "";
    replyTargetId.value = null;
    await fetchComments();
  } catch (err) {
    errorMsg.value =
      err?.data?.message || err?.message || "Không gửi được bình luận";
  } finally {
    submitting.value = false;
  }
};

const likeComment = async (c) => {
  if (!auth.accessToken) {
    alert("Vui lòng đăng nhập.");
    return;
  }

  // Check trạng thái đã like chưa
  if (c.userHasLiked) {
    // Gọi API unlike
    try {
      await api(`/posts/comments/${c.id}/like`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      c.likeCount = Math.max(0, (c.likeCount || 0) - 1);
      c.userHasLiked = false;
    } catch (err) {
      console.error("Unlike comment error:", err);
    }
  } else {
    // Gọi API like
    try {
      await api(`/posts/comments/${c.id}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      c.likeCount = (c.likeCount || 0) + 1;
      c.userHasLiked = true;
    } catch (err) {
      console.error("Like comment error:", err);
    }
  }
};

const replyTo = (c) => {
  replyTargetId.value = c.id;
};

const togglePostLike = async () => {
  if (!auth.accessToken) {
    alert("Vui lòng đăng nhập.");
    return;
  }
  likingPost.value = true;

  try {
    if (postUserHasLiked.value) {
      // Unlike
      await api(`/posts/${props.postId}/like`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      postLikes.value = Math.max(0, postLikes.value - 1);
      postUserHasLiked.value = false;
    } else {
      // Like
      await api(`/posts/${props.postId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      postLikes.value += 1;
      postUserHasLiked.value = true;
    }
  } catch (err) {
    console.error("Toggle post like error:", err);
  } finally {
    likingPost.value = false;
  }
};

const parentAuthor = (parentId) => {
  if (!parentId) return "";
  const found = (comments.value || []).find((x) => x.id === parentId);
  return found?.authorName || "";
};

const isVideo = (url) => /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(url);
const initial = (name = "?") => (name?.trim()?.charAt(0) || "?").toUpperCase();
const formatDate = (iso) => {
  const d = new Date(iso);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "Vừa xong";
  if (sec < 3600) return `${Math.floor(sec / 60)} phút trước`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} giờ trước`;
  return d.toLocaleDateString("vi-VN");
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

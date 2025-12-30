<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8 max-w-6xl">
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-black"
        ></div>
      </div>

      <!-- Main Content -->
      <div v-else class="grid grid-cols-12 gap-6">
        <!-- LEFT SIDEBAR - User Info -->
        <aside class="col-span-12 md:col-span-4 lg:col-span-4">
          <div class="sticky top-6 space-y-6">
            <div
              class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200"
            >
              <!-- User Avatar -->
              <div class="bg-linear-to-br from-gray-800 to-gray-900 h-24"></div>
              <div class="px-6 pb-6">
                <div class="-mt-12 mb-4">
                  <div
                    class="w-24 h-24 mx-auto rounded-full bg-white shadow-lg flex items-center justify-center border-4 border-white"
                  >
                    <UserCircleIcon class="w-20 h-20 text-gray-500" />
                  </div>
                </div>

                <h2 class="text-center font-bold text-lg text-gray-900">
                  {{ displayName }}
                </h2>
                <p class="text-center text-xs text-gray-600 mt-1 font-medium">
                  <span class="font-semibold">{{ posts.length }}</span> bài viết
                  <span class="mx-2 text-gray-400">•</span>
                  <span class="font-semibold">{{ friendCount }}</span> bạn bè
                </p>

                <div v-if="!isOwnProfile && auth.user" class="mt-3 space-y-2">
                  <button
                    v-if="
                      friendshipStatus === 'not_friends' || !friendshipStatus
                    "
                    @click="sendFriendRequest"
                    :disabled="friendActionLoading"
                    class="w-full py-2 rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-60 transition-all duration-200 font-semibold text-sm shadow-lg hover:shadow-xl"
                  >
                    {{ friendActionLoading ? "Đang gửi..." : "Kết bạn" }}
                  </button>

                  <div
                    v-else-if="friendshipStatus === 'request_sent'"
                    class="w-full flex items-center gap-2"
                  >
                    <div
                      class="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 border border-gray-200 text-sm font-semibold text-center"
                    >
                      Đã gửi lời mời
                    </div>
                    <button
                      @click="cancelSentFriendRequest"
                      :disabled="friendActionLoading || !pendingRequestId"
                      class="px-3 py-2 rounded-lg bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 disabled:opacity-60 text-sm font-semibold"
                    >
                      {{ friendActionLoading ? "Đang hủy..." : "Hủy lời mời" }}
                    </button>
                  </div>

                  <div
                    v-else-if="friendshipStatus === 'friends'"
                    class="w-full flex items-center gap-2"
                  >
                    <div
                      class="flex-1 py-2 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 text-sm font-semibold text-center"
                    >
                      Đã là bạn bè
                    </div>
                    <button
                      @click="removeFriend"
                      :disabled="friendActionLoading"
                      class="px-3 py-2 rounded-lg bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 disabled:opacity-60 text-sm font-semibold"
                    >
                      {{ friendActionLoading ? "Đang hủy..." : "Hủy kết bạn" }}
                    </button>
                  </div>

                  <div
                    v-else-if="friendshipStatus === 'request_received'"
                    class="flex gap-2"
                  >
                    <button
                      @click="acceptFriendRequest"
                      :disabled="friendActionLoading"
                      class="flex-1 py-2 rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-60 transition-all duration-200 text-sm font-semibold shadow-lg hover:shadow-xl"
                    >
                      {{ friendActionLoading ? "Đang xử lý..." : "Chấp nhận" }}
                    </button>
                    <button
                      @click="rejectFriendRequest"
                      :disabled="friendActionLoading"
                      class="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 disabled:opacity-60 transition-all duration-200 text-sm font-semibold"
                    >
                      Từ chối
                    </button>
                  </div>
                </div>

                <!-- Nút tạo bài viết chỉ hiển thị nếu xem profile của chính mình -->
                <button
                  v-if="isOwnProfile"
                  @click="showModal = true"
                  class="mt-4 w-full py-2 rounded-lg bg-black text-white hover:bg-gray-800 transition-all duration-200 font-semibold text-sm shadow-lg hover:shadow-xl"
                >
                  Tạo bài viết mới
                </button>
              </div>
            </div>

            <!-- Friends List -->
            <div
              v-if="isOwnProfile && auth.user"
              class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200"
            >
              <div class="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h3 class="font-bold text-sm text-gray-900">
                  Bạn bè ({{ friendCount }})
                </h3>
              </div>
              <div class="px-4 py-3 max-h-96 overflow-y-auto">
                <div v-if="loadingFriends" class="text-center py-4">
                  <div
                    class="animate-spin rounded-full h-6 w-6 border-b-2 border-black mx-auto"
                  ></div>
                </div>
                <div
                  v-else-if="friendsList.length === 0"
                  class="text-center py-6 text-gray-500 text-sm"
                >
                  Chưa có bạn bè nào
                </div>
                <div v-else class="space-y-2">
                  <NuxtLink
                    v-for="friend in friendsList"
                    :key="friend.id"
                    :to="`/feed/${friend.id}`"
                    class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div
                      class="w-10 h-10 rounded-full bg-linear-to-br from-gray-700 to-gray-900 flex items-center justify-center shrink-0"
                    >
                      <span class="text-white text-sm font-bold">{{
                        (friend.fullName || friend.email || "?")
                          .charAt(0)
                          .toUpperCase()
                      }}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-semibold text-gray-900 truncate">
                        {{ friend.fullName || friend.email || "Người dùng" }}
                      </p>
                      <p
                        v-if="friend.email"
                        class="text-xs text-gray-500 truncate"
                      >
                        {{ friend.email }}
                      </p>
                    </div>
                  </NuxtLink>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <!-- RIGHT MAIN CONTENT -->
        <main class="col-span-12 md:col-span-8 lg:col-span-8">
          <!-- Empty State -->
          <div
            v-if="posts.length === 0"
            class="bg-white rounded-xl p-12 shadow-sm text-center"
          >
            <div
              class="w-20 h-20 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4"
            >
              <svg
                class="w-10 h-10 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                ></path>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">
              {{
                isOwnProfile
                  ? "Chưa có bài viết nào"
                  : "Người dùng này chưa có bài viết công khai"
              }}
            </h3>
            <p class="text-gray-500 mb-6">
              {{
                isOwnProfile
                  ? "Hãy tạo bài viết đầu tiên của bạn để chia sẻ với mọi người!"
                  : "Bài viết của người dùng này hiện chưa được công khai"
              }}
            </p>
            <button
              v-if="isOwnProfile"
              @click="showModal = true"
              class="px-6 py-2.5 rounded-lg bg-black text-white hover:bg-gray-800 transition"
            >
              Tạo bài viết
            </button>
          </div>

          <!-- Posts List -->
          <div v-else class="space-y-4">
            <div
              v-for="post in posts"
              :key="post.id"
              class="bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200 border border-gray-200 overflow-visible"
            >
              <!-- Post Header -->
              <div class="px-3 py-2 border-b border-gray-200 bg-gray-50">
                <div class="flex items-center gap-2">
                  <div
                    class="w-8 h-8 rounded-full bg-linear-to-br from-gray-700 to-gray-900 flex items-center justify-center"
                  >
                    <UserCircleIcon class="w-6 h-6 text-white" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-semibold text-xs text-gray-900 truncate">
                      {{ post.authorName || displayName }}
                    </p>
                    <div
                      class="flex items-center gap-1 text-[10px] text-gray-500"
                    >
                      <span>{{ mapPrivacy(post.visibility) }}</span>
                      <span>•</span>
                      <span>{{ formatDate(post.createdAt) }}</span>
                      <template v-if="post.isEdited">
                        <span>•</span>
                        <span class="text-gray-400 italic">Đã chỉnh sửa</span>
                      </template>
                    </div>
                  </div>
                  <!-- Menu Button - chỉ hiển thị nếu là bài viết của chính mình -->
                  <div v-if="isOwnProfile" class="relative">
                    <button
                      @click="
                        activeMenuPostId =
                          activeMenuPostId === post.id ? null : post.id
                      "
                      class="p-1 hover:bg-gray-200 rounded transition"
                    >
                      <EllipsisVerticalIcon class="w-5 h-5 text-gray-600" />
                    </button>
                    <!-- Dropdown Menu -->
                    <div
                      v-if="activeMenuPostId === post.id"
                      class="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-40"
                    >
                      <button
                        @click="
                          handleEditPost(post);
                          activeMenuPostId = null;
                        "
                        class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-200 font-medium"
                      >
                        Chỉnh sửa bài viết
                      </button>
                      <button
                        @click="
                          handleDeletePost(post.id);
                          activeMenuPostId = null;
                        "
                        class="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 font-medium"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Post Content -->
              <div class="px-3 py-2 bg-gray-50">
                <p
                  v-html="renderContent(post)"
                  class="text-gray-900 leading-snug whitespace-pre-wrap text-xs break-words"
                ></p>
                <button
                  v-if="isContentLong(post.content)"
                  @click="toggleExpand(post.id)"
                  class="mt-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                >
                  {{ isExpanded(post.id) ? "Thu gọn" : "Xem thêm" }}
                </button>
              </div>

              <!-- Post Media -->
              <div v-if="mediaVisual(post).length" class="bg-white">
                <div
                  :class="[
                    'grid gap-0.5',
                    mediaVisual(post).length === 1
                      ? 'grid-cols-1'
                      : mediaVisual(post).length === 2
                      ? 'grid-cols-2'
                      : mediaVisual(post).length === 3
                      ? 'grid-cols-3'
                      : 'grid-cols-2',
                  ]"
                >
                  <div
                    v-for="(m, index) in mediaVisual(post).slice(0, 4)"
                    :key="m.id"
                    class="relative bg-white group cursor-pointer overflow-hidden"
                    :class="[mediaVisual(post).length === 1 ? 'h-80' : 'h-48']"
                    @click="openMediaGallery(mediaVisual(post), index)"
                  >
                    <!-- Video -->
                    <video
                      v-if="isVideo(m.postFileUrl)"
                      :src="m.postFileUrl"
                      class="w-full h-full object-contain bg-white"
                      autoplay
                      loop
                      muted
                      playsinline
                    ></video>

                    <!-- Image -->
                    <img
                      v-else
                      :src="m.postFileUrl"
                      :alt="'Post media'"
                      class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />

                    <!-- More items overlay -->
                    <div
                      v-if="index === 3 && mediaVisual(post).length > 4"
                      class="absolute inset-0 bg-linear-to-br from-black/20 via-black/30 to-black/40 flex items-center justify-center hover:from-black/30 hover:via-black/40 hover:to-black/50 transition"
                    >
                      <span class="text-white text-4xl font-bold drop-shadow-lg"
                        >+{{ mediaVisual(post).length - 4 }}</span
                      >
                    </div>
                  </div>
                </div>
              </div>

              <!-- Post Footer with Tagged Products -->
              <div
                v-if="post.products?.length"
                class="px-3 py-2 border-t border-gray-200 bg-gray-50"
              >
                <p class="text-[10px] text-gray-600 mb-1.5 font-medium">
                  Sản phẩm đính kèm:
                </p>
                <div class="flex flex-wrap gap-1">
                  <NuxtLink
                    v-for="product in post.products"
                    :key="product.id"
                    :to="`/product/${product.id}`"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-white text-gray-800 hover:bg-gray-100 transition cursor-pointer font-medium border border-gray-300 hover:border-gray-400"
                  >
                    <img
                      v-if="product.thumbnailUrl || product.imageUrl"
                      :src="product.thumbnailUrl || product.imageUrl"
                      alt=""
                      class="w-8 h-8 rounded object-cover border border-gray-200"
                    />
                    <span class="truncate max-w-[140px]">{{
                      product.name
                    }}</span>
                  </NuxtLink>
                </div>
              </div>

              <!-- Post Files -->
              <div
                v-if="post.media?.some((m) => m.type === 'file')"
                class="px-3 py-2 border-t border-gray-200 bg-gray-50"
              >
                <p class="text-[10px] text-gray-600 mb-1.5 font-medium">
                  Tập tin đính kèm:
                </p>
                <div class="space-y-1">
                  <a
                    v-for="file in post.media.filter((m) => m.type === 'file')"
                    :key="file.id"
                    :href="file.postFileUrl"
                    target="_blank"
                    rel="noopener"
                    class="flex items-center gap-2 text-xs text-blue-700 hover:text-blue-900 hover:underline"
                  >
                    <span
                      class="inline-flex items-center justify-center w-7 h-7 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold"
                    >
                      {{ fileExtension(file.postFileUrl) || "DOC" }}
                    </span>
                    <span class="truncate">{{
                      fileNameFromUrl(file.postFileUrl)
                    }}</span>
                  </a>
                </div>
              </div>

              <!-- Actions -->
              <div class="px-3 py-2 border-t border-gray-200 bg-white">
                <div class="flex items-center justify-center gap-3">
                  <button
                    @click="toggleLike(post)"
                    :class="[
                      'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-sm transition-all min-w-[160px] ring-1 ring-inset',
                      likedPostIds.has(post.id)
                        ? 'bg-blue-600 text-white ring-blue-600 hover:bg-blue-700'
                        : 'bg-white text-gray-700 ring-gray-200 hover:bg-gray-50',
                    ]"
                    aria-label="Thích bài viết"
                  >
                    <HandThumbUpIcon class="w-5 h-5" />
                    <span>Thích</span>
                    <span class="text-xs opacity-80"
                      >({{ postStats[post.id]?.likes ?? 0 }})</span
                    >
                  </button>
                  <button
                    @click="openComments(post.id)"
                    class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium shadow-sm transition-all min-w-[160px] ring-1 ring-inset ring-gray-200"
                    aria-label="Bình luận bài viết"
                  >
                    <ChatBubbleLeftEllipsisIcon class="w-5 h-5" />
                    <span>Bình luận</span>
                    <span class="text-xs opacity-80"
                      >({{ postStats[post.id]?.comments ?? 0 }})</span
                    >
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>

    <!-- Create Post Modal -->
    <CreatePostModal
      v-if="showModal && isOwnProfile"
      :products="products"
      :mode="editMode"
      :post="editingPost"
      @close="
        showModal = false;
        editMode = 'create';
        editingPost = null;
      "
      @created="handlePostCreated"
      @updated="handlePostUpdated"
    />

    <!-- Media Gallery Modal -->
    <MediaGalleryModal
      :is-open="showMediaGallery"
      :media-list="currentGalleryMedia"
      :start-index="currentMediaIndex || 0"
      @close="showMediaGallery = false"
    />
    <CommentsModal
      :is-open="showComments"
      :post-id="activePostId"
      @close="showComments = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import { UserCircleIcon, EllipsisVerticalIcon } from "@heroicons/vue/24/solid";
import CreatePostModal from "@/components/modals/feed/CreatePostModal.vue";
import MediaGalleryModal from "@/components/MediaGalleryModal.vue";
import CommentsModal from "@/components/modals/feed/CommentsModal.vue";
import {
  HandThumbUpIcon,
  ChatBubbleLeftEllipsisIcon,
} from "@heroicons/vue/24/solid";
import { usePostStats } from "@/composables/usePostStats.js";

const route = useRoute();
const config = useRuntimeConfig();
const auth = useAuthStore();

const showModal = ref(false);
const posts = ref([]);
const products = ref([]);
const loading = ref(true);
const userProfile = ref(null);
const showMediaGallery = ref(false);
const currentGalleryMedia = ref([]);
const currentMediaIndex = ref(null);
const activeMenuPostId = ref(null);
const editMode = ref("create");
const editingPost = ref(null);
const friendCount = ref(0);
const friendshipStatus = ref(null);
const pendingRequestId = ref(null);
const friendActionLoading = ref(false);
const expandedPostIds = ref(new Set()); // Theo dõi bài nào đang expand
const friendsList = ref([]);
const loadingFriends = ref(false);

// Comment modal state
const showComments = ref(false);
const activePostId = ref(null);
const likedPostIds = reactive(new Set());
const openComments = (postId) => {
  activePostId.value = postId;
  showComments.value = true;
};

// Fetch liked posts
const fetchLikedPosts = async () => {
  if (!auth.accessToken) return;
  try {
    const res = await $fetch("/posts/liked/me", {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    const likedIds = res?.data || [];
    likedIds.forEach((id) => likedPostIds.add(id));
  } catch (err) {
    console.error("Error fetching liked posts:", err);
  }
};

const tryOpenCommentsFromRoute = () => {
  const queryPostId = route.query.postId;
  const wantsComments =
    route.query.comments === "1" || route.query.comments === "true";
  if (wantsComments && queryPostId) {
    activePostId.value = queryPostId;
    showComments.value = true;
  }
};

// Per-post stats (likes & comments)
const { postStats, bumpLike } = usePostStats(
  posts,
  config.public.apiBase,
  computed(() => auth.accessToken)
);

// Like/Unlike post with UI state
const toggleLike = async (post) => {
  if (!auth.accessToken) {
    alert("Đăng nhập để thích bài viết");
    return;
  }
  const liked = likedPostIds.has(post.id);
  try {
    if (!liked) {
      await $fetch(`/posts/${post.id}/like`, {
        baseURL: config.public.apiBase,
        method: "POST",
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      likedPostIds.add(post.id);
      bumpLike(post.id, 1);
    } else {
      await $fetch(`/posts/${post.id}/like`, {
        baseURL: config.public.apiBase,
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      likedPostIds.delete(post.id);
      bumpLike(post.id, -1);
    }
  } catch (err) {
    console.error("Toggle like error:", err);
  }
};

// Kiểm tra content có quá dài không (>300 ký tự)
const isContentLong = (content) => content?.length > 300;

// Lấy content preview (300 ký tự đầu)
const getContentPreview = (content) => content?.slice(0, 300) + "...";

// Toggle expand
const toggleExpand = (postId) => {
  if (expandedPostIds.value.has(postId)) {
    expandedPostIds.value.delete(postId);
  } else {
    expandedPostIds.value.add(postId);
  }
};

// Kiểm tra bài có đang expand không
const isExpanded = (postId) => expandedPostIds.value.has(postId);

const isOwnProfile = computed(
  () => String(route.params.id) === String(auth.user?.id || "")
);

// Hiển thị tên gọn gàng: ưu tiên tên của chính mình, fallback tên bài viết đầu tiên
const displayName = computed(() => {
  if (isOwnProfile.value && auth.user) {
    return auth.user.fullName || auth.user.email || "Người dùng";
  }
  if (userProfile.value) {
    return (
      userProfile.value.fullName || userProfile.value.email || "Người dùng"
    );
  }
  return posts.value[0]?.authorName || "Người dùng";
});

// Helper gọi API gọn
const api = (url, options = {}) =>
  $fetch(url, { baseURL: config.public.apiBase, ...options });

onMounted(async () => {
  const targetId = route.params.id;

  await Promise.all([
    fetchUserPosts(targetId),
    fetchProducts(),
    fetchFriendCount(targetId),
    fetchFriendshipStatus(targetId),
    fetchUserProfile(targetId),
    fetchFriends(targetId),
    fetchLikedPosts(),
  ]);

  tryOpenCommentsFromRoute();
  loading.value = false;
});

watch(
  () => route.query,
  () => {
    tryOpenCommentsFromRoute();
  },
  { deep: true }
);

// Lấy posts theo user ID
const fetchUserPosts = async (userId) => {
  try {
    const response = isOwnProfile.value
      ? await api("/posts/me", {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        })
      : await api(`/posts/user/${userId}`);

    posts.value = response?.data || response || [];
  } catch (err) {
    console.error("Error fetching posts:", err);
    posts.value = [];
  }
};

// Lấy thông tin user để hiển thị tên khi chưa có bài viết
const fetchUserProfile = async (userId) => {
  if (!auth.accessToken) return;

  try {
    const res = await api("/users", {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    const list = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
      ? res
      : [];
    const found = list.find((u) => String(u.id) === String(userId));
    userProfile.value = found || null;
  } catch (err) {
    console.error("Error fetching user profile:", err);
    userProfile.value = null;
  }
};

// Lấy danh sách bạn bè
const fetchFriends = async (userId) => {
  if (!auth.accessToken) return;

  loadingFriends.value = true;
  try {
    // Nếu xem profile của người khác, lấy danh sách bạn bè của họ bằng cách duyệt tất cả user và filter
    // Nếu xem profile của mình, gọi API /friends
    if (isOwnProfile.value) {
      const res = await api("/friends", {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      friendsList.value = res?.data || res || [];
    } else {
      // Với profile người khác, ta cần gọi API riêng hoặc dùng workaround
      // Tạm thời để trống vì API chưa hỗ trợ lấy friends của user khác
      friendsList.value = [];
    }
  } catch (err) {
    console.error("Error fetching friends:", err);
    friendsList.value = [];
  } finally {
    loadingFriends.value = false;
  }
};

// Lấy số bạn bè của user
const fetchFriendCount = async (userId) => {
  if (!auth.accessToken) {
    friendCount.value = 0;
    return;
  }

  try {
    const response = await api(`/friends/count/${userId}`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    friendCount.value = response?.data?.count ?? response?.count ?? 0;
  } catch (err) {
    console.error("Error fetching friend count:", err);
    friendCount.value = 0;
  }
};

// Kiểm tra trạng thái kết bạn
const fetchFriendshipStatus = async (userId) => {
  if (!auth.accessToken || isOwnProfile.value) {
    friendshipStatus.value = null;
    pendingRequestId.value = null;
    return;
  }

  try {
    const response = await api(`/friends/status/${userId}`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    friendshipStatus.value =
      response?.data?.status || response?.status || "not_friends";
    pendingRequestId.value =
      response?.data?.requestId || response?.requestId || null;
  } catch (err) {
    console.error("Error fetching friendship status:", err);
    friendshipStatus.value = null;
    pendingRequestId.value = null;
  }
};

// Lấy danh sách sản phẩm
const fetchProducts = async () => {
  try {
    const response = await api("/product/all-products");
    products.value = response?.data || response || [];
  } catch (err) {
    console.error("Error fetching products:", err);
  }
};

// Gửi lời mời kết bạn
const sendFriendRequest = async () => {
  if (!auth.accessToken) {
    alert("Vui lòng đăng nhập để kết bạn.");
    return;
  }

  friendActionLoading.value = true;

  try {
    const response = await api("/friends/request", {
      method: "POST",
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      body: { receiverId: route.params.id },
    });

    friendshipStatus.value = "request_sent";
    pendingRequestId.value = response?.data?.id || response?.id || null;
  } catch (err) {
    console.error("Error sending friend request:", err);
    const message =
      err?.data?.message ||
      err?.message ||
      "Không gửi được lời mời. Vui lòng thử lại.";
    alert(message);
    await fetchFriendshipStatus(route.params.id);
  } finally {
    friendActionLoading.value = false;
  }
};

// Chấp nhận lời mời kết bạn
const acceptFriendRequest = async () => {
  if (!pendingRequestId.value || !auth.accessToken) return;

  friendActionLoading.value = true;

  try {
    await api(`/friends/request/${pendingRequestId.value}/accept`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    friendshipStatus.value = "friends";
    await fetchFriendCount(route.params.id);
  } catch (err) {
    console.error("Error accepting friend request:", err);
    alert("Không thể chấp nhận lời mời. Vui lòng thử lại.");
  } finally {
    friendActionLoading.value = false;
  }
};

// Từ chối lời mời kết bạn
const rejectFriendRequest = async () => {
  if (!pendingRequestId.value || !auth.accessToken) return;

  friendActionLoading.value = true;

  try {
    await api(`/friends/request/${pendingRequestId.value}/reject`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    friendshipStatus.value = "not_friends";
    pendingRequestId.value = null;
  } catch (err) {
    console.error("Error rejecting friend request:", err);
    alert("Không thể từ chối lời mời. Vui lòng thử lại.");
  } finally {
    friendActionLoading.value = false;
  }
};

// Hủy lời mời đã gửi
const cancelSentFriendRequest = async () => {
  if (!pendingRequestId.value || !auth.accessToken) return;

  friendActionLoading.value = true;

  try {
    await api(`/friends/request/${pendingRequestId.value}/cancel`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    friendshipStatus.value = "not_friends";
    pendingRequestId.value = null;
  } catch (err) {
    console.error("Error canceling friend request:", err);
    alert("Không thể hủy lời mời. Vui lòng thử lại.");
  } finally {
    friendActionLoading.value = false;
  }
};

// Hủy kết bạn
const removeFriend = async () => {
  if (!auth.accessToken) return;

  friendActionLoading.value = true;

  try {
    await api(`/friends/${route.params.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    friendshipStatus.value = "not_friends";
    pendingRequestId.value = null;
    await fetchFriendCount(route.params.id);
  } catch (err) {
    console.error("Error removing friend:", err);
    alert("Không thể hủy kết bạn. Vui lòng thử lại.");
  } finally {
    friendActionLoading.value = false;
  }
};

const handlePostCreated = (response) => {
  const post = response.data?.post || response.post;
  posts.value.unshift({
    ...post,
    media: response.data?.media || response.media || [],
    products: response.data?.products || response.products || [],
    authorName: auth.user?.fullName || auth.user?.email,
  });
  showModal.value = false;
  editMode.value = "create";
  editingPost.value = null;
};

const handlePostUpdated = (response) => {
  const post = response.data?.post || response.post;
  const idx = posts.value.findIndex((p) => p.id === post.id);
  if (idx > -1) {
    posts.value[idx] = {
      ...post,
      media: response.data?.media || response.media || [],
      products: response.data?.products || response.products || [],
    };
  }
  showModal.value = false;
  editMode.value = "create";
  editingPost.value = null;
};

// Check if file is video
const isVideo = (url) => /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(url);

// Open media gallery
const openMediaGallery = (list, idx) => {
  currentGalleryMedia.value = list;
  currentMediaIndex.value = idx;
  showMediaGallery.value = true;
};

// Linkify like ChatBox: short and direct
function formatMessage(content) {
  if (!content) return "";
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return content.replace(urlRegex, (url) => {
    if (url.includes("/invite/")) {
      const token = url.split("/invite/")[1];
      return `<a href="/invite/${token}" data-token="${token}" class="underline text-blue-700 break-all">${url}</a>`;
    }
    return `<a href="${url}" target="_blank" rel="noopener" class="underline text-blue-700 break-all">${url}</a>`;
  });
}

// Render expanded/preview text then linkify
function renderContent(post) {
  const text =
    isExpanded(post.id) || !isContentLong(post.content)
      ? post.content || ""
      : getContentPreview(post.content || "");
  return formatMessage(text);
}

// Media & file helpers
const mediaVisual = (p) => p.media?.filter((m) => m.type !== "file") || [];
const fileNameFromUrl = (u) => {
  const name = u?.split("/").pop()?.split("?")[0] || "Tệp đính kèm";
  const parts = name.split("-");
  return parts.length > 1 && /^\d{6,}$/.test(parts[0])
    ? parts.slice(1).join("-")
    : name;
};
const fileExtension = (u) => {
  const match = u?.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toUpperCase().slice(0, 3) : "FILE";
};
const mapPrivacy = (v) =>
  ({ public: "Công khai", friends: "Bạn bè", private: "Chỉ mình tôi" }[v] || v);
const formatDate = (iso) => {
  const date = new Date(iso);
  const sec = Math.floor((new Date() - date) / 1000);
  if (sec < 60) return "Vừa xong";
  if (sec < 3600) return `${Math.floor(sec / 60)} phút trước`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} giờ trước`;
  if (sec < 604800) return `${Math.floor(sec / 86400)} ngày trước`;
  return date.toLocaleDateString("vi-VN");
};

const handleEditPost = (post) => {
  editingPost.value = post;
  editMode.value = "edit";
  showModal.value = true;
};

const handleDeletePost = async (postId) => {
  if (!confirm("Xóa bài viết này?")) return;

  try {
    const res = await api(`/posts/${postId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    if (res.success) {
      posts.value = posts.value.filter((p) => p.id !== postId);
    }
  } catch (err) {
    alert("Lỗi xóa bài: " + (err.message || ""));
  }
};
</script>

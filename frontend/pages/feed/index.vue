<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8 max-w-6xl">
      <!-- Loading State -->
      <div v-if="pending" class="flex items-center justify-center py-20">
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-black"
        ></div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="bg-white rounded-xl p-12 shadow-sm text-center border border-gray-200"
      >
        <div
          class="w-20 h-20 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4"
        >
          <svg
            class="w-10 h-10 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">
          Không thể tải feed
        </h3>
        <p class="text-gray-500">{{ errorMessage }}</p>
      </div>

      <!-- Main Content -->
      <div v-else>
        <!-- TOP COMPOSER -->
        <div class="mb-8">
          <div
            class="bg-white rounded-xl shadow border border-gray-200 overflow-hidden"
          >
            <div class="p-5">
              <div class="flex items-center gap-4">
                <div
                  class="w-12 h-12 rounded-full bg-linear-to-br from-gray-700 to-gray-900 flex items-center justify-center shrink-0"
                >
                  <UserCircleIcon class="w-9 h-9 text-white" />
                </div>
                <button
                  @click="handleOpenComposer"
                  class="flex-1 text-left text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-full px-5 py-3 text-sm transition"
                >
                  {{
                    auth.isLoggedIn
                      ? "Bạn đang nghĩ gì?"
                      : "Đăng nhập để viết bài"
                  }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- DISCOVER USERS -->
        <div class="mb-8" v-if="auth.isLoggedIn">
          <div
            class="bg-white rounded-lg border border-gray-200 overflow-hidden"
          >
            <div
              class="flex items-center justify-between px-3 py-2 border-b border-gray-200"
            >
              <h3 class="text-sm font-semibold text-gray-900">Gợi ý kết bạn</h3>
              <div class="flex items-center gap-2">
                <button
                  @click="scrollDiscover(-1)"
                  class="p-1.5 rounded-full text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition"
                  aria-label="Cuộn trái"
                >
                  <ChevronLeftIcon class="w-5 h-5" />
                </button>
                <button
                  @click="scrollDiscover(1)"
                  class="p-1.5 rounded-full text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition"
                  aria-label="Cuộn phải"
                >
                  <ChevronRightIcon class="w-5 h-5" />
                </button>
              </div>
            </div>

            <div class="px-3 py-3">
              <div ref="discoverWrap" class="overflow-x-auto whitespace-nowrap">
                <div class="inline-flex gap-3">
                  <div
                    v-for="u in discoverUsers"
                    :key="u.id"
                    class="w-56 flex-shrink-0 border border-gray-200 rounded-md p-3 bg-white"
                  >
                    <div class="flex flex-col items-center text-center gap-3">
                      <div
                        class="w-16 h-16 rounded-md bg-gray-100 text-gray-700 flex items-center justify-center text-xl font-bold"
                      >
                        {{ initial(u.fullName || u.email) }}
                      </div>
                      <p
                        class="text-sm font-semibold text-gray-900 truncate w-full"
                      >
                        {{ u.fullName || u.email || "Người dùng" }}
                      </p>
                      <button
                        v-if="!u.requestSent"
                        @click="sendFriend(u)"
                        :disabled="requesting.has(u.id)"
                        class="w-full py-2 rounded-md bg-black text-white hover:bg-gray-800 disabled:opacity-60 text-sm font-semibold"
                      >
                        {{ requesting.has(u.id) ? "Đang gửi..." : "Kết bạn" }}
                      </button>
                      <div v-else class="w-full flex flex-col gap-2">
                        <div
                          class="w-full py-2 rounded-md bg-gray-100 text-gray-700 border border-gray-200 text-sm font-semibold text-center"
                        >
                          Đã gửi yêu cầu
                        </div>
                        <button
                          @click="cancelRequest(u)"
                          :disabled="requesting.has(u.id) || !u.requestId"
                          class="w-full py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-60 text-sm font-semibold"
                        >
                          {{
                            requesting.has(u.id) ? "Đang hủy..." : "Hủy lời mời"
                          }}
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Loading placeholder -->
                  <div
                    v-if="loadingDiscover && !discoverUsers.length"
                    class="text-sm text-gray-500 px-3 py-2"
                  >
                    Đang tải người dùng…
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- POSTS GRID -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Empty State -->
          <div
            v-if="!posts?.length"
            class="col-span-1 lg:col-span-2 bg-white rounded-xl p-12 shadow text-center border border-gray-200"
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
                auth.isLoggedIn
                  ? "Chưa có bài viết nào"
                  : "Hãy đăng nhập để xem bài viết"
              }}
            </h3>
            <p class="text-gray-500 mb-6">
              {{
                auth.isLoggedIn
                  ? "Bạn bè của bạn chưa đăng bài viết nào hoặc các bài viết công khai chưa xuất hiện"
                  : "Đăng nhập để xem bài viết của bạn bè và những bài viết công khai"
              }}
            </p>
            <NuxtLink
              v-if="!auth.isLoggedIn"
              to="/login-page"
              class="px-6 py-2.5 rounded-lg bg-black text-white hover:bg-gray-800 transition inline-block"
            >
              Đăng nhập
            </NuxtLink>
          </div>

          <!-- Posts List -->
          <div v-else class="col-span-1 lg:col-span-2 space-y-5">
            <div
              v-for="post in posts"
              :key="post.id"
              class="bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-200"
            >
              <!-- Post Header -->
              <div class="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-full bg-linear-to-br from-gray-700 to-gray-900 flex items-center justify-center shrink-0"
                  >
                    <UserCircleIcon class="w-7 h-7 text-white" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <NuxtLink
                      :to="`/feed/${post.authorId}`"
                      class="font-semibold text-sm text-gray-900 hover:text-gray-700 truncate block"
                    >
                      {{ post.authorName || "Người dùng" }}
                    </NuxtLink>
                    <div
                      class="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5"
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
                </div>
              </div>

              <!-- Post Content -->
              <div class="px-4 py-3 bg-gray-50">
                <p
                  v-html="renderContent(post)"
                  class="text-gray-900 leading-relaxed whitespace-pre-wrap text-sm break-words"
                ></p>
                <button
                  v-if="isContentLong(post.content)"
                  @click="toggleExpand(post.id)"
                  class="mt-2 text-sm font-semibold text-blue-700 hover:text-blue-800 transition"
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
                    :class="[mediaVisual(post).length === 1 ? 'h-96' : 'h-56']"
                    @click="openMediaGallery(mediaVisual(post), index)"
                  >
                    <!-- Video -->
                    <video
                      v-if="isVideo(m.postFileUrl)"
                      :src="m.postFileUrl"
                      class="w-full h-full object-contain bg-white"
                    ></video>

                    <!-- Image -->
                    <img
                      v-else
                      :src="m.postFileUrl"
                      :alt="'Post media'"
                      class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />

                    <!-- Play icon for video -->
                    <div
                      v-if="isVideo(m.postFileUrl)"
                      class="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition"
                    >
                      <svg
                        class="w-12 h-12 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"
                        ></path>
                      </svg>
                    </div>

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
                class="px-4 py-3 border-t border-gray-200 bg-gray-50"
              >
                <p class="text-xs text-gray-600 mb-2 font-semibold">
                  Sản phẩm đính kèm:
                </p>
                <div class="flex flex-wrap gap-1.5">
                  <NuxtLink
                    v-for="product in post.products"
                    :key="product.id"
                    :to="`/product/${product.id}`"
                    class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] bg-white text-gray-800 hover:bg-gray-100 transition cursor-pointer font-medium border border-gray-300 hover:border-gray-400"
                  >
                    <img
                      v-if="product.thumbnailUrl"
                      :src="product.thumbnailUrl"
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
                class="px-4 py-3 border-t border-gray-200 bg-gray-50"
              >
                <p class="text-xs text-gray-600 mb-2.5 font-semibold">
                  Tập tin đính kèm:
                </p>
                <div class="space-y-1.5">
                  <a
                    v-for="file in post.media.filter((m) => m.type === 'file')"
                    :key="file.id"
                    :href="file.postFileUrl"
                    target="_blank"
                    rel="noopener"
                    class="flex items-center gap-2 text-xs text-blue-700 hover:text-blue-900 hover:underline group"
                  >
                    <span
                      class="inline-flex items-center justify-center w-8 h-8 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold group-hover:bg-blue-100"
                    >
                      {{ fileExtension(file.postFileUrl) || "DOC" }}
                    </span>
                    <span class="truncate">{{
                      fileNameFromUrl(file.postFileUrl)
                    }}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Post Modal -->
    <CreatePostModal
      v-if="openCreate"
      :products="productList"
      mode="create"
      @close="openCreate = false"
      @created="handleCreated"
    />

    <!-- Media Gallery Modal -->
    <MediaGalleryModal
      :is-open="showMediaGallery"
      :media-list="currentGalleryMedia"
      :start-index="currentMediaIndex || 0"
      @close="showMediaGallery = false"
    />
  </div>
</template>

<script setup>
import CreatePostModal from "@/components/modals/feed/CreatePostModal.vue";
import MediaGalleryModal from "@/components/MediaGalleryModal.vue";
import { useAuthStore } from "@/stores/auth";
import { UserCircleIcon } from "@heroicons/vue/24/solid";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/vue/24/outline";

const auth = useAuthStore();
const config = useRuntimeConfig();
const openCreate = ref(false);
const showMediaGallery = ref(false);
const currentGalleryMedia = ref([]);
const currentMediaIndex = ref(null);
const expandedPostIds = ref(new Set()); // Theo dõi bài nào đang expand

// Discover users (customers not friends)
const discoverUsers = ref([]);
const loadingDiscover = ref(false);
const discoverWrap = ref(null);
const requesting = ref(new Set());

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

// Lấy feed bài viết từ API
const {
  data: feedData,
  pending,
  error,
} = await useAsyncData("feed", () => $fetch("/posts"), { server: false });

const posts = computed(() => feedData.value?.data || feedData.value || []);
const errorMessage = computed(
  () => error?.value?.data?.message || error?.value?.message
);

// Lấy danh sách sản phẩm cho modal
const { data: productsData } = await useAsyncData(
  "products-for-post",
  () => $fetch("/product/all-products"),
  { server: false }
);

const productList = computed(
  () => productsData.value?.data || productsData.value || []
);

// Kiểm tra đăng nhập trước khi mở modal tạo bài
const handleOpenComposer = () => {
  if (!auth.isLoggedIn) {
    alert("Hãy đăng nhập để đăng bài");
    return;
  }
  openCreate.value = true;
};

// Xử lý khi tạo bài viết mới
const handleCreated = (newPost) => {
  if (!feedData.value) feedData.value = [];
  const responseData = newPost.data || newPost;
  const newPostFormatted = {
    ...(responseData.post || responseData),
    media: responseData.media || [],
    products: responseData.products || [],
    authorName: auth.user?.fullName || auth.user?.email || "Người dùng",
  };
  const current = Array.isArray(feedData.value?.data)
    ? feedData.value.data
    : Array.isArray(feedData.value)
    ? feedData.value
    : [];
  current.unshift(newPostFormatted);
  if (Array.isArray(feedData.value?.data)) {
    feedData.value.data = current;
  } else {
    feedData.value = current;
  }
};

// Chuyển visibility thành text Việt
const mapPrivacy = (v) =>
  ({
    public: "Công khai",
    friends: "Bạn bè",
    private: "Riêng tư",
  }[v] || v);

// Định dạng thời gian bài viết
const formatDate = (iso) => {
  try {
    const date = new Date(iso);
    const sec = Math.floor((new Date() - date) / 1000);
    if (sec < 60) return "Vừa xong";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} phút trước`;
    const hour = Math.floor(min / 60);
    if (hour < 24) return `${hour} giờ trước`;
    const day = Math.floor(hour / 24);
    return day < 7 ? `${day} ngày trước` : date.toLocaleDateString("vi-VN");
  } catch {
    return "";
  }
};

// Lọc media là ảnh/video (không tính file)
const mediaVisual = (post) =>
  post.media?.filter((m) => ["image", "video"].includes(m.type)) || [];

// Kiểm tra URL có phải video
const isVideo = (url) => /\.(mp4|webm|ogg|mov)$/i.test(url);

// Mở gallery xem media
const openMediaGallery = (mediaList, index) => {
  currentGalleryMedia.value = mediaList;
  currentMediaIndex.value = index;
  showMediaGallery.value = true;
};

// Helpers for avatar letter
const initial = (name = "?") => (name?.trim()?.charAt(0) || "?").toUpperCase();

// Fetch discover users from existing /users API, then filter client-side
const fetchDiscover = async () => {
  if (!auth.accessToken) return;
  loadingDiscover.value = true;
  try {
    const res = await $fetch("/users", {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    const all = (res?.data || res || []).filter((u) => {
      // Chỉ hiện role customer, loại bỏ chính mình
      if (String(u.id) === String(auth.user?.id)) return false;
      return String(u.role).toLowerCase() === "customer";
    });

    // Lấy trạng thái kết bạn cho từng user, loại bỏ đã là bạn
    const enriched = await Promise.all(
      all.slice(0, 40).map(async (u) => {
        try {
          const st = await $fetch(`/friends/status/${u.id}`, {
            baseURL: config.public.apiBase,
            headers: { Authorization: `Bearer ${auth.accessToken}` },
          });
          const status = st?.data?.status || st?.status || "not_friends";
          const requestId = st?.data?.requestId || st?.requestId || null;
          return {
            ...u,
            friendshipStatus: status,
            requestSent: status === "request_sent",
            requestId,
          };
        } catch {
          return {
            ...u,
            friendshipStatus: "not_friends",
            requestSent: false,
            requestId: null,
          };
        }
      })
    );

    discoverUsers.value = enriched.filter(
      (u) => u.friendshipStatus !== "friends"
    );
  } catch (err) {
    console.error("Không thể tải danh sách người dùng:", err);
    discoverUsers.value = [];
  } finally {
    loadingDiscover.value = false;
  }
};

onMounted(() => {
  fetchDiscover();
});

// Send friend request
const sendFriend = async (u) => {
  if (!auth.accessToken) {
    alert("Vui lòng đăng nhập để kết bạn.");
    return;
  }
  requesting.value.add(u.id);
  try {
    const res = await $fetch("/friends/request", {
      method: "POST",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      body: { receiverId: u.id },
    });
    const requestId = res?.data?.id || res?.data?.requestId || res?.requestId;
    u.requestSent = true;
    if (requestId) u.requestId = requestId;
  } catch (err) {
    console.error("Lỗi gửi kết bạn:", err);
    alert(err?.data?.message || "Không thể gửi lời mời kết bạn.");
  } finally {
    requesting.value.delete(u.id);
  }
};

// Cancel friend request
const cancelRequest = async (u) => {
  if (!auth.accessToken) {
    alert("Vui lòng đăng nhập.");
    return;
  }
  if (!u.requestId) {
    alert("Không tìm thấy requestId để hủy.");
    return;
  }
  requesting.value.add(u.id);
  try {
    await $fetch(`/friends/request/${u.requestId}/cancel`, {
      method: "DELETE",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    u.requestSent = false;
    u.requestId = null;
    u.friendshipStatus = "not_friends";
  } catch (err) {
    console.error("Lỗi hủy lời mời:", err);
    alert(err?.data?.message || "Không thể hủy lời mời kết bạn.");
  } finally {
    requesting.value.delete(u.id);
  }
};

// Horizontal scroll controls
const scrollDiscover = (dir) => {
  const el = discoverWrap.value;
  if (!el) return;
  const amount = Math.max(300, el.clientWidth * 0.8);
  el.scrollBy({ left: dir * amount, behavior: "smooth" });
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

// Lấy phần mở rộng file
const fileExtension = (url) => {
  try {
    const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    return match ? match[1].toUpperCase().slice(0, 3) : "FILE";
  } catch {
    return "FILE";
  }
};

// Lấy tên file từ URL
const fileNameFromUrl = (url) => {
  try {
    return decodeURIComponent(url.split("/").pop()?.split("?")[0] || "File");
  } catch {
    return "File";
  }
};
</script>

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
              <div class="px-4 py-3 bg-white">
                <p
                  class="text-gray-900 leading-relaxed whitespace-pre-wrap text-sm"
                >
                  {{ post.content }}
                </p>
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
                    :class="[mediaVisual(post).length === 1 ? 'h-64' : 'h-40']"
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

const auth = useAuthStore();
const openCreate = ref(false);
const showMediaGallery = ref(false);
const currentGalleryMedia = ref([]);
const currentMediaIndex = ref(null);

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

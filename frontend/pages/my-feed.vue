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
        <!-- LEFT SIDEBAR -->
        <aside class="col-span-12 md:col-span-4 lg:col-span-4">
          <div
            class="bg-white rounded-xl shadow-md overflow-hidden sticky top-6 border border-gray-200"
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
                {{ auth.user?.fullName || "Người dùng" }}
              </h2>
              <p class="text-center text-xs text-gray-600 mt-1 font-medium">
                {{ posts.length }} bài viết
              </p>

              <button
                @click="showModal = true"
                class="mt-4 w-full py-2 rounded-lg bg-black text-white hover:bg-gray-800 transition-all duration-200 font-semibold text-sm shadow-lg hover:shadow-xl"
              >
                Tạo bài viết mới
              </button>
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
              Chưa có bài viết nào
            </h3>
            <p class="text-gray-500 mb-6">
              Hãy tạo bài viết đầu tiên của bạn để chia sẻ với mọi người!
            </p>
            <button
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
              class="bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-200"
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
                      {{ auth.user?.fullName || "Người dùng" }}
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
                  <!-- Menu Button -->
                  <div class="relative">
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
                      class="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-48"
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
                        Xóa bài viết
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Post Content -->
              <div class="px-3 py-2 bg-white">
                <p
                  class="text-gray-900 leading-snug whitespace-pre-wrap text-xs"
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
                    :class="[mediaVisual(post).length === 1 ? 'h-56' : 'h-36']"
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
            </div>
          </div>
        </main>
      </div>
    </div>

    <!-- Create Post Modal -->
    <CreatePostModal
      v-if="showModal"
      :products="products"
      :mode="editMode"
      :post="editingPost"
      @close="showModal = false; editMode = 'create'; editingPost = null"
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
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import { UserCircleIcon, EllipsisVerticalIcon } from "@heroicons/vue/24/solid";
import CreatePostModal from "@/components/modals/feed/CreatePostModal.vue";
import MediaGalleryModal from "@/components/MediaGalleryModal.vue";

const config = useRuntimeConfig();
const auth = useAuthStore();

const showModal = ref(false);
const posts = ref([]);
const products = ref([]);
const loading = ref(true);
const showMediaGallery = ref(false);
const currentGalleryMedia = ref([]);
const currentMediaIndex = ref(null);
const activeMenuPostId = ref(null);
const editMode = ref('create');
const editingPost = ref(null);

onMounted(async () => {
  await Promise.all([fetchMyPosts(), fetchProducts()]);
  loading.value = false;
});

const fetchMyPosts = async () => {
  try {
    const response = await $fetch("/posts/me", {
      baseURL: config.public.apiBase,
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
      },
    });

    console.log("Posts response:", response);
    posts.value = response?.data || response || [];
  } catch (err) {
    console.error("Error fetching posts:", err);
    posts.value = [];
  }
};

const fetchProducts = async () => {
  try {
    const response = await $fetch("/product/all-products", {
      baseURL: config.public.apiBase,
    });
    console.log("Products response:", response);
    products.value = response?.data || response || [];
  } catch (err) {
    console.error("Error fetching products:", err);
    products.value = [];
  }
};

const handlePostCreated = (response) => {
  // 1. Lấy dữ liệu từ response
  const responseData = response.data || response;

  // 2. Cấu trúc lại dữ liệu
  const newPostFormatted = {
    ...responseData.post,
    media: responseData.media || [],
    products: responseData.products || [],
    author: auth.user || null,
  };

  // 3. Đẩy vào đầu danh sách
  posts.value.unshift(newPostFormatted);
  showModal.value = false;
  editMode.value = 'create';
  editingPost.value = null;
};

const handlePostUpdated = (response) => {
  const responseData = response.data || response;
  
  const updatedPostFormatted = {
    ...responseData.post,
    media: responseData.media || [],
    products: responseData.products || [],
    author: auth.user || null,
  };
  
  const idx = posts.value.findIndex(p => p.id === updatedPostFormatted.id);
  if (idx > -1) {
    posts.value[idx] = updatedPostFormatted;
  }
  
  showModal.value = false;
  editMode.value = 'create';
  editingPost.value = null;
};

// Check if file is video
const isVideo = (url) => {
  if (!url) return false;
  const videoExtensions = [".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv"];
  return videoExtensions.some((ext) => url.toLowerCase().includes(ext));
};

// Open media gallery
const openMediaGallery = (mediaList, startIndex) => {
  currentGalleryMedia.value = mediaList;
  currentMediaIndex.value = startIndex;
  showMediaGallery.value = true;
};

// Helpers for files/media
const mediaVisual = (post) =>
  post.media?.filter((m) => m.type !== "file") || [];

const fileNameFromUrl = (url) => {
  if (!url) return "Tệp đính kèm";
  const last = url.split("/").pop();
  if (!last) return "Tệp đính kèm";
  const parts = last.split("-");
  if (parts.length > 1 && /^\d{6,}$/.test(parts[0])) {
    parts.shift();
    return parts.join("-");
  }
  return last;
};

const fileExtension = (url) => {
  if (!url) return "";
  const last = url.split("/").pop() || "";
  const dot = last.lastIndexOf(".");
  if (dot === -1) return "";
  return last
    .slice(dot + 1)
    .slice(0, 4)
    .toUpperCase();
};

// Helper functions
const mapPrivacy = (v) => {
  const map = {
    public: "Công khai",
    friends: "Bạn bè",
    private: "Chỉ mình tôi",
  };
  return map[v] || "Công khai";
};

const formatDate = (dateString) => {
  if (!dateString) return "";

  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "Vừa xong";
  if (diffInSeconds < 3600)
    return `${Math.floor(diffInSeconds / 60)} phút trước`;
  if (diffInSeconds < 86400)
    return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)} ngày trước`;

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const handleEditPost = (post) => {
  editMode.value = 'edit';
  editingPost.value = post;
  showModal.value = true;
};

const handleDeletePost = async (postId) => {
  if (!confirm("Bạn có chắc chắn muốn xóa bài viết này?")) {
    return;
  }

  try {
    const response = await $fetch(`/posts/${postId}`, {
      method: "DELETE",
      baseURL: config.public.apiBase,
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
      },
    });

    if (response.success) {
      posts.value = posts.value.filter((p) => p.id !== postId);
      console.log("Delete post success");
    }
  } catch (err) {
    console.error("Error deleting post:", err);
    alert("Lỗi khi xóa bài viết: " + (err.message || "Không rõ nguyên nhân"));
  }
};
</script>

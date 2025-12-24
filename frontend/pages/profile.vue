<template>
  <div class="container mx-auto px-6 py-10 grid grid-cols-12 gap-8">
    <!-- LEFT: USER INFO -->
    <aside class="col-span-12 md:col-span-4 lg:col-span-3">
      <div class="bg-white rounded-2xl shadow-md p-6 text-center">
        <div
          class="w-24 h-24 mx-auto rounded-full bg-gray-100 flex items-center justify-center shadow"
        >
          <UserCircleIcon class="w-16 h-16 text-gray-400" />
        </div>

        <h2 class="mt-4 text-lg font-semibold text-gray-800">
          {{ auth.user?.fullName }}
        </h2>

        <p class="text-sm text-gray-500">{{ posts.length }} bài viết</p>

        <button
          @click="showCreateModal = true"
          class="mt-6 w-full py-2.5 bg-black text-white rounded-lg hover:bg-gray-900"
        >
          Đăng bài
        </button>
      </div>
    </aside>

    <!-- RIGHT: POSTS -->
    <main class="col-span-12 md:col-span-8 lg:col-span-9 space-y-6">
      <div v-if="posts.length === 0" class="text-center text-gray-400 py-20">
        Bạn chưa có bài viết nào
      </div>

      <div
        v-for="post in posts"
        :key="post.id"
        class="bg-white rounded-2xl shadow p-6"
      >
        <!-- Header -->
        <div class="flex items-center gap-3 mb-3">
          <div
            class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <UserCircleIcon class="w-8 h-8 text-gray-400" />
          </div>
          <div>
            <p class="text-sm font-semibold">{{ auth.user?.fullName }}</p>
            <p class="text-xs text-gray-500">
              {{ mapVisibility(post.visibility) }}
            </p>
          </div>
        </div>

        <!-- Content -->
        <p class="text-gray-800 mb-3">
          {{ post.content }}
        </p>

        <!-- Media -->
        <div
          v-if="post.media?.length"
          class="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4"
        >
          <img
            v-for="m in post.media"
            :key="m.id"
            :src="m.postFileUrl"
            class="h-32 w-full object-cover rounded-lg"
          />
        </div>

        <!-- Products -->
        <div v-if="post.products?.length" class="flex gap-3 overflow-x-auto">
          <div
            v-for="p in post.products"
            :key="p.id"
            class="min-w-[140px] border rounded-lg p-2 bg-gray-50"
          >
            <img
              :src="p.thumbnailUrl"
              class="h-24 w-full object-cover rounded"
            />
            <p class="text-xs font-medium truncate mt-1">
              {{ p.name }}
            </p>
            <p class="text-xs text-gray-600">
              {{ formatPrice(p.price) }}
            </p>
          </div>
        </div>
      </div>
    </main>

    <!-- MODAL -->
    <CreatePostModal
      v-if="showCreateModal"
      :products="products"
      @close="showCreateModal = false"
      @created="handlePostCreated"
    />
  </div>
</template>

<script setup>
import { UserCircleIcon } from "@heroicons/vue/24/solid";
import { useAuthStore } from "@/stores/auth";
import CreatePostModal from "@/components/modals/feed/CreatePostModal.vue";

const auth = useAuthStore();
const config = useRuntimeConfig();

const posts = ref([]);
const products = ref([]);
const showCreateModal = ref(false);

onMounted(async () => {
  await Promise.all([fetchMyPosts(), fetchProducts()]);
});

const fetchMyPosts = async () => {
  posts.value = await $fetch("/posts/me", {
    baseURL: config.public.apiBase,
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
    },
  });
};

const fetchProducts = async () => {
  products.value = await $fetch("/product/all-products", {
    baseURL: config.public.apiBase,
  });
};

const handlePostCreated = (newPost) => {
  posts.value.unshift(newPost);
  showCreateModal.value = false;
};

const mapVisibility = (v) =>
  v === "public"
    ? "🌍 Công khai"
    : v === "friends"
    ? "👥 Bạn bè"
    : "🔒 Riêng tư";

const formatPrice = (v) =>
  new Intl.NumberFormat("vi-VN").format(Number(v || 0)) + "đ";
</script>

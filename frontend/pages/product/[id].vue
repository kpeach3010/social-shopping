<template>
  <div>
    <main class="container mx-auto px-4 py-10" v-if="!loading && product">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
        <!-- Ảnh -->
        <div class="flex gap-4">
          <!-- Danh sách ảnh nhỏ -->
          <div class="flex flex-col gap-3 w-20">
            <img
              v-for="(img, idx) in allImages"
              :key="idx"
              :src="img"
              class="w-20 h-20 object-cover rounded border cursor-pointer hover:opacity-80"
              :class="selectedImage === img ? 'border-2 border-black' : ''"
              @click="selectedImage = img"
            />
          </div>

          <!-- Ảnh lớn -->
          <div class="flex-1">
            <img
              :src="selectedImage"
              :alt="product.name"
              class="w-full rounded-lg shadow"
            />
          </div>
        </div>

        <!-- Thông tin -->
        <div>
          <h1 class="text-2xl font-bold">{{ product.name }}</h1>
          <p class="text-lg text-gray-600">
            {{ formatPrice(product.price_default) }}
          </p>
          <p class="text-sm text-gray-500">Kho: {{ product.stock }} sản phẩm</p>

          <!-- Chọn màu -->
          <div class="mt-4">
            <h3 class="font-semibold">Màu sắc</h3>
            <div class="flex gap-2 mt-2">
              <button
                v-for="color in uniqueColors"
                :key="color"
                @click="!isColorDisabled(color) && selectColor(color)"
                :disabled="isColorDisabled(color)"
                :class="[
                  'px-3 py-1 border rounded',
                  selectedColor === color ? 'bg-black text-white' : 'bg-white',
                  isColorDisabled(color) ? 'opacity-40 cursor-not-allowed' : '',
                ]"
              >
                {{ color }}
              </button>
            </div>
          </div>

          <!-- Chọn size -->
          <div class="mt-4">
            <h3 class="font-semibold">Kích thước</h3>
            <div class="flex gap-2 mt-2">
              <button
                v-for="size in uniqueSizes"
                :key="size"
                @click="!isSizeDisabled(size) && (selectedSize = size)"
                :disabled="isSizeDisabled(size)"
                :class="[
                  'px-3 py-1 border rounded',
                  selectedSize === size ? 'bg-black text-white' : 'bg-white',
                  isSizeDisabled(size) ? 'opacity-40 cursor-not-allowed' : '',
                ]"
              >
                {{ size }}
              </button>
            </div>
          </div>

          <!-- Số lượng -->
          <div class="mt-4 flex items-center gap-3">
            <button
              @click="decQty"
              class="px-3 py-1 border rounded hover:bg-gray-100"
            >
              -
            </button>
            <span>{{ quantity }}</span>
            <button
              @click="incQty"
              class="px-3 py-1 border rounded hover:bg-gray-100"
            >
              +
            </button>
          </div>

          <!-- Nút hành động -->
          <div class="mt-6 flex gap-3">
            <button
              @click="addToCart"
              class="px-6 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Thêm vào giỏ hàng
            </button>
            <button
              @click="buyNow"
              class="px-6 py-2 bg-black text-white rounded hover:bg-gray-800"
            >
              Mua ngay
            </button>
          </div>

          <!-- Coupon -->
          <div class="mt-6">
            <h3 class="font-semibold mb-2">Mã giảm giá</h3>

            <div v-if="coupons.length" class="space-y-2">
              <div
                v-for="c in coupons"
                :key="c.id"
                class="flex items-center justify-between px-3 py-2 border rounded-lg bg-white shadow-sm hover:shadow-md transition text-sm cursor-pointer"
                @click="openCouponDetail(c.id)"
              >
                <!-- Thông tin coupon -->
                <div>
                  <span class="font-semibold text-gray-600 mr-2">
                    {{ c.kind === "general" ? "Mã cá nhân:" : "Mã nhóm:" }}
                  </span>

                  <span class="font-mono font-semibold text-gray-900 mr-2">
                    {{ c.code }}
                  </span>

                  <span class="text-green-600 font-bold mx-2">
                    Giảm
                    <span v-if="c.type === 'percent'">{{ c.value }}%</span>
                    <span v-else>{{ formatPrice(c.value) }}</span>
                  </span>

                  <span v-if="c.endsAt" class="text-blue-500 text-xs">
                    Đơn tối thiểu {{ formatPrice(c.minOrderTotal) }}
                  </span>
                </div>

                <!-- Nút tạo nhóm nếu là coupon group -->
                <div
                  v-if="c.kind === 'group'"
                  class="flex flex-col items-end gap-1 mt-1 text-sm text-gray-900"
                >
                  <button
                    @click.stop="createInviteLink(c.id)"
                    class="px-3 py-1 bg-black text-white rounded-full hover:bg-gray-800 text-xs font-semibold shadow-sm active:scale-[0.97]"
                  >
                    + Tạo nhóm
                  </button>
                  <div
                    v-if="groupInviteLinks[c.id]"
                    class="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-2 py-1 w-fit mt-1"
                  >
                    <span class="font-medium text-gray-800">Link:</span>
                    <input
                      readonly
                      :value="groupInviteLinks[c.id]"
                      class="bg-transparent w-[140px] truncate focus:outline-none cursor-text text-gray-800"
                      @click.stop="$event.target.select()"
                    />
                    <button
                      @click.stop="copyInviteLink(groupInviteLinks[c.id])"
                      class="text-xs font-semibold text-blue-700 hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-else
              class="p-4 border rounded-lg bg-gray-50 text-center text-gray-500"
            >
              Không có mã giảm giá phù hợp
            </div>
          </div>
        </div>
      </div>
      <!-- Mô tả sản phẩm đặt dưới grid -->
      <div class="mt-10">
        <h3 class="text-lg font-semibold mb-2">Mô tả chi tiết</h3>
        <p class="text-gray-700 leading-relaxed">
          {{ product.description }}
        </p>
      </div>

      <div class="mt-16 border-t pt-10">
        <div
          class="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6"
        >
          <div>
            <h3 class="text-2xl font-bold text-gray-900">
              Khách hàng đánh giá
            </h3>
            <div class="flex items-center mt-2 gap-4">
              <div class="flex items-center">
                <span class="text-3xl font-extrabold text-gray-900 mr-2">{{
                  calculateAverage()
                }}</span>
                <div class="flex">
                  <svg
                    v-for="i in 5"
                    :key="i"
                    class="w-5 h-5"
                    :class="
                      i <= Math.round(calculateAverage())
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                    "
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                    />
                  </svg>
                </div>
              </div>
              <p class="text-sm text-gray-500">
                Dựa trên {{ reviews.length }} nhận xét
              </p>
            </div>
          </div>
        </div>
        <div v-if="loadingReviews" class="flex justify-center py-10">
          <div
            class="animate-spin rounded-full h-8 w-8 border-b-2 border-black"
          ></div>
        </div>

        <div
          v-else-if="!reviews.length"
          class="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed"
        >
          <p class="text-gray-500">
            Chưa có đánh giá nào. Hãy là người đầu tiên chia sẻ cảm nhận!
          </p>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="r in paginatedReviews"
            :key="r.id"
            class="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-md hover:shadow-lg transition animate-fade-in"
          >
            <div class="flex items-start gap-4">
              <div
                class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 uppercase flex-shrink-0"
              >
                {{ r.fullName.charAt(0) }}
              </div>

              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <h4 class="font-bold text-gray-900">{{ r.fullName }}</h4>
                  <span class="text-sm text-gray-400">{{
                    formatDate(r.createdAt)
                  }}</span>
                </div>

                <div class="flex items-center gap-2 mt-0.5">
                  <div class="flex">
                    <svg
                      v-for="i in 5"
                      :key="i"
                      class="w-3.5 h-3.5"
                      :class="
                        i <= r.rating ? 'text-yellow-400' : 'text-gray-200'
                      "
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                      />
                    </svg>
                  </div>
                  <span class="text-gray-300 text-xs">|</span>
                  <span class="text-xs text-gray-500"
                    >Phân loại: {{ r.variantName }}</span
                  >
                </div>

                <p class="mt-4 text-gray-700 leading-relaxed">
                  {{ r.comment }}
                </p>

                <div
                  v-if="r.media?.length"
                  class="flex gap-2 mt-4 overflow-x-auto pb-2"
                >
                  <template v-for="(m, idx) in r.media" :key="idx">
                    <div
                      v-if="m.type === 'image'"
                      class="relative w-24 h-24 flex-shrink-0 group overflow-hidden rounded-lg border border-gray-100 cursor-pointer"
                      @click="openMediaGallery(r.media, idx)"
                    >
                      <img
                        :src="m.fileUrl"
                        class="w-full h-full object-cover transition duration-300 group-hover:scale-110"
                      />
                    </div>

                    <div
                      v-else
                      class="relative w-48 h-24 flex-shrink-0 rounded-lg overflow-hidden border cursor-pointer group"
                      @click="openMediaGallery(r.media, idx)"
                    >
                      <video class="w-full h-full object-cover">
                        <source :src="m.fileUrl" type="video/mp4" />
                      </video>
                      <div
                        class="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition"
                      >
                        <svg
                          class="w-8 h-8 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"
                          ></path>
                        </svg>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Phân trang đánh giá -->
        <div
          v-if="totalReviewsPages > 1"
          class="flex justify-center mt-8 gap-2"
        >
          <button
            class="px-3 py-1 rounded border hover:bg-gray-100 disabled:opacity-40"
            :disabled="currentReviewPage === 1"
            @click="prevReviewPage"
          >
            ‹
          </button>
          <button
            v-for="p in reviewPages"
            :key="p"
            class="px-3 py-1 rounded border"
            :class="
              currentReviewPage === p
                ? 'bg-black text-white'
                : 'hover:bg-gray-100'
            "
            @click="goToReviewPage(p)"
          >
            {{ p }}
          </button>
          <button
            class="px-3 py-1 rounded border hover:bg-gray-100 disabled:opacity-40"
            :disabled="currentReviewPage === totalReviewsPages"
            @click="nextReviewPage"
          >
            ›
          </button>
        </div>
      </div>
    </main>

    <!-- Media Gallery Modal -->
    <MediaGalleryModal
      :is-open="showMediaGallery"
      :media-list="currentGalleryMedia"
      :start-index="currentMediaIndex || 0"
      @close="showMediaGallery = false"
    />

    <!-- Coupon Detail Modal -->
    <CouponDetailModal
      :is-open="showCouponDetail"
      :coupon="selectedCoupon"
      @close="showCouponDetail = false"
    />
  </div>
</template>

<script setup>
import { useAuthStore } from "@/stores/auth";
import MediaGalleryModal from "@/components/MediaGalleryModal.vue";
import CouponDetailModal from "@/components/modals/CouponDetailModal.vue";

const route = useRoute();
const config = useRuntimeConfig();
const auth = useAuthStore();
const requestURL = useRequestURL();

const product = ref(null);
const loading = ref(true);
const selectedImage = ref(null);
const selectedColor = ref(null);
const selectedSize = ref(null);
const quantity = ref(1);
const coupons = ref([]);
const groupInviteLinks = ref({});
const reviews = ref([]);
const loadingReviews = ref(true);
const currentReviewPage = ref(1);
const reviewsPerPage = 3;
const showMediaGallery = ref(false);
const currentGalleryMedia = ref([]);
const currentMediaIndex = ref(null);
const showCouponDetail = ref(false);
const selectedCoupon = ref(null);

const createInviteLink = async (couponId) => {
  if (!auth.accessToken) {
    alert("Bạn cần đăng nhập để tạo nhóm");
    return;
  }

  try {
    const res = await $fetch("/conversations/invite-links", {
      method: "POST",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      body: {
        productId: product.value.id,
        couponId,

        frontendUrl: `${requestURL.origin}${config.app?.baseURL || "/"}`,
      },
    });

    if (res.reused) {
      if (res.isUsed) {
        alert(
          `Bạn đã có nhóm đang hoạt động!\nTên nhóm: ${res.conversationName}`
        );
      }
    }

    groupInviteLinks.value = {
      ...groupInviteLinks.value,
      [couponId]: res.inviteLink,
    };
  } catch (e) {
    alert("Không thể tạo link mời: " + (e?.data?.message || e.message));
  }
};

function copyInviteLink(link) {
  navigator.clipboard.writeText(link);
  alert("Đã copy link mời!");
}

const allImages = computed(() => {
  if (!product.value) return [];
  const variantImages = product.value.variants.map((v) => v.imageUrl);
  return [product.value.thumbnailUrl, ...new Set(variantImages)];
});

const formatPrice = (v) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    v || 0
  );

const uniqueColors = computed(() => [
  ...new Set(product.value?.variants.map((v) => v.color)),
]);
const uniqueSizes = computed(() => [
  ...new Set(product.value?.variants.map((v) => v.size)),
]);

const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const incQty = () => quantity.value++;
const decQty = () => {
  if (quantity.value > 1) quantity.value--;
};

// api hiển thị đánh giá
const fetchReviews = async () => {
  try {
    const res = await $fetch(`/reviews/product/${route.params.id}`, {
      baseURL: config.public.apiBase,
    });
    reviews.value = res;
  } catch (e) {
    console.error("Lỗi load reviews:", e);
  } finally {
    loadingReviews.value = false;
  }
};

onMounted(async () => {
  try {
    const res = await $fetch(`/product/get-product/${route.params.id}`, {
      baseURL: config.public.apiBase,
    });
    product.value = res;
    selectedImage.value = res.thumbnailUrl;
    // gọi API lấy coupon khả dụng
    const variantIds = res.variants.map((v) => v.id).join(",");
    if (auth.isLoggedIn) {
      if (variantIds) {
        const couponRes = await $fetch(
          `/coupons/available?variantIds=${variantIds}`,
          {
            baseURL: config.public.apiBase,
            headers: { Authorization: `Bearer ${auth.accessToken}` }, // nếu cần login
          }
        );
        coupons.value = couponRes;
      }
    }
    await fetchReviews();
  } catch (e) {
    console.error("Lỗi load sản phẩm:", e);
  } finally {
    loading.value = false;
  }
});

const selectColor = (color) => {
  if (selectedColor.value === color) {
    selectedColor.value = null;
    selectedImage.value = product.value.thumbnailUrl;
  } else {
    selectedColor.value = color;
    const variant = product.value.variants.find((v) => v.color === color);
    selectedImage.value = variant?.imageUrl || product.value.thumbnailUrl;
  }
};

// Kiểm tra color có hợp lệ với size đang chọn không
const isColorDisabled = (color) => {
  if (!selectedSize.value) return false; // nếu chưa chọn size thì tất cả color đều được chọn
  return !product.value.variants.some(
    (v) => v.color === color && v.size === selectedSize.value
  );
};

// Kiểm tra size có hợp lệ với color đang chọn không
const isSizeDisabled = (size) => {
  if (!selectedColor.value) return false; // nếu chưa chọn color thì tất cả size đều được chọn
  return !product.value.variants.some(
    (v) => v.size === size && v.color === selectedColor.value
  );
};

const addToCart = async () => {
  if (!auth.accessToken) {
    alert("Bạn cần đăng nhập để thêm sản phẩm vào giỏ");
    return;
  }

  const variant = product.value.variants.find(
    (v) => v.color === selectedColor.value && v.size === selectedSize.value
  );

  if (!variant) {
    alert("Vui lòng chọn màu và size");
    return;
  }

  if (quantity.value > variant.stock) {
    alert(`Chỉ còn ${variant.stock} sản phẩm trong kho`);
    return;
  }

  try {
    await $fetch("/cart/add", {
      method: "POST",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      body: {
        variantId: variant.id,
        quantity: quantity.value,
      },
    });

    // Bắn sự kiện để Header tự reload lại số lượng
    if (process.client) {
      window.dispatchEvent(new CustomEvent("cart-updated"));
    }
    alert("Đã thêm vào giỏ hàng");
  } catch (e) {
    console.error("Lỗi thêm giỏ hàng:", e);
    alert("Không thể thêm vào giỏ (có thể số lượng không đủ)");
  }
};

const buyNow = () => {
  const variant = product.value.variants.find(
    (v) => v.color === selectedColor.value && v.size === selectedSize.value
  );
  if (!variant) {
    alert("Vui lòng chọn màu và size");
    return;
  }

  const items = [
    {
      variantId: variant.id,
      productName: product.value.name,
      variantName: `${variant.color} ${variant.size}`,
      quantity: quantity.value,
      price: variant.price,
      imageUrl: variant.imageUrl,
    },
  ];

  localStorage.setItem("checkoutItems", JSON.stringify(items));
  localStorage.setItem("checkoutFromCart", "false");
  navigateTo("/checkout");
};

// Tính điểm trung bình cộng của các review
const calculateAverage = () => {
  if (!reviews.value.length) return 0;
  const total = reviews.value.reduce((sum, r) => sum + r.rating, 0);
  return (total / reviews.value.length).toFixed(1);
};

const totalReviewsPages = computed(() =>
  Math.ceil(reviews.value.length / reviewsPerPage)
);

const paginatedReviews = computed(() => {
  const start = (currentReviewPage.value - 1) * reviewsPerPage;
  return reviews.value.slice(start, start + reviewsPerPage);
});

const reviewPages = computed(() =>
  Array.from({ length: totalReviewsPages.value }, (_, i) => i + 1)
);

const goToReviewPage = (p) => {
  if (p >= 1 && p <= totalReviewsPages.value) currentReviewPage.value = p;
};
const prevReviewPage = () => goToReviewPage(currentReviewPage.value - 1);
const nextReviewPage = () => goToReviewPage(currentReviewPage.value + 1);

// Media Gallery Logic
const openMediaGallery = (mediaList, startIndex) => {
  currentGalleryMedia.value = mediaList;
  currentMediaIndex.value = startIndex;
  showMediaGallery.value = true;
};

// Coupon Detail Logic
const openCouponDetail = (couponId) => {
  const coupon = coupons.value.find((c) => c.id === couponId);
  if (coupon) {
    selectedCoupon.value = coupon;
    showCouponDetail.value = true;
  }
};
</script>

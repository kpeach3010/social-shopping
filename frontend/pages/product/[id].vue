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
                class="flex items-center justify-between px-3 py-2 border rounded-lg bg-white shadow-sm hover:shadow-md transition text-sm"
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
                    @click="createInviteLink(c.id)"
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
                      @click="$event.target.select()"
                    />
                    <button
                      @click="copyInviteLink(groupInviteLinks[c.id])"
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

      <!-- Bình luận -->
      <div class="mt-10">
        <h3 class="text-lg font-semibold mb-4">Bình luận</h3>

        <!-- Form nhập bình luận -->
        <div class="mb-6">
          <textarea
            placeholder="Viết bình luận của bạn..."
            class="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-black"
            rows="3"
          ></textarea>
          <button
            class="mt-2 px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
          >
            Gửi bình luận
          </button>
        </div>

        <!-- Đánh giá sản phẩm -->
        <div class="mt-10">
          <h3 class="text-lg font-semibold mb-4">Đánh giá sản phẩm</h3>
          <!-- </div> -->
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const config = useRuntimeConfig();
const auth = useAuthStore();

const product = ref(null);
const loading = ref(true);
const selectedImage = ref(null);
const selectedColor = ref(null);
const selectedSize = ref(null);
const quantity = ref(1);
const coupons = ref([]);
const groupInviteLinks = ref({});

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
        frontendUrl: window.location.origin,
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
</script>

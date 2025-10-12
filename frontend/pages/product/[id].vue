lỗi k hiển thị coupon nữa
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

                  <span v-if="c.endsAt" class="text-red-500 text-xs">
                    Hết hạn {{ formatDate(c.endsAt) }}
                  </span>
                </div>

                <!-- Nút tạo nhóm nếu là coupon group -->
                <div
                  v-if="c.kind === 'group'"
                  class="ml-4 flex flex-col items-end"
                >
                  <button
                    @click="createGroupOrder(c.id)"
                    class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs mb-1"
                  >
                    Tạo nhóm
                  </button>
                  <div
                    v-if="groupInviteLinks[c.id]"
                    class="text-xs text-blue-700 break-all mt-1"
                  >
                    <span>Link mời: </span>
                    <a
                      href="#"
                      @click.prevent="
                        handleInviteClick(groupInviteLinks[c.id], c.id)
                      "
                      class="underline text-blue-700"
                      >{{ groupInviteLinks[c.id] }}</a
                    >
                    <button
                      @click="copyInviteLink(groupInviteLinks[c.id])"
                      class="ml-2 text-xs text-blue-600 underline"
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

        <!-- Danh sách bình luận (demo)
        <div class="space-y-6"> -->
        <!-- Bình luận 1
          <div class="p-4 border rounded-lg">
            <p class="font-semibold">Nguyễn Văn A</p>
            <p class="text-gray-600 text-sm">1m67, 43 kí mặc size gì ạ?</p> -->

        <!-- Nút trả lời -->
        <!-- <button
              class="text-sm text-blue-600 mt-2 hover:underline"
              @click="showReply = !showReply"
            >
              Trả lời
            </button> -->

        <!-- Form trả lời -->
        <!-- <div v-if="showReply" class="mt-2">
              <textarea
                placeholder="Viết câu trả lời..."
                class="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                rows="2"
              ></textarea>
              <button
                class="mt-1 px-3 py-1 bg-black text-white rounded text-sm hover:bg-gray-800"
              >
                Gửi
              </button>
            </div>

            Trả lời hiển thị
            <div class="mt-3 space-y-2">
              <div class="flex items-start text-sm text-gray-700">
                <span class="mr-2 text-gray-400">↳</span>
                <div>
                  <p class="font-semibold">Shop</p>
                  <p>Bạn mặc size S nha ❤️</p>
                </div>
              </div>
            </div>
            -->
        <!-- </div> -->
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
const showReply = ref(false);
const groupInviteLinks = ref({});
const joiningGroup = ref(false);
const joinError = ref("");

async function handleInviteClick(link, couponId) {
  if (!auth.accessToken) {
    alert("Bạn cần đăng nhập để tham gia nhóm");
    return;
  }
  const token = link.split("/invite/")[1];
  if (!token) return;
  joiningGroup.value = true;
  joinError.value = "";
  try {
    const res = await $fetch("/conversations/join-group", {
      method: "POST",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      body: { invitelink: token },
    });
    // Mở chatbox group, truyền dữ liệu cho chatbox
    window.dispatchEvent(
      new CustomEvent("open-group-chat", { detail: res.conversation })
    );
  } catch (e) {
    joinError.value =
      e?.data?.message || e.message || "Không thể tham gia nhóm";
    // Không alert, chỉ hiển thị lỗi trên giao diện nếu cần
  } finally {
    joiningGroup.value = false;
  }
}
const createGroupOrder = async (couponId) => {
  if (!auth.accessToken) {
    alert("Bạn cần đăng nhập để tạo nhóm");
    return;
  }
  try {
    const res = await $fetch("/conversations/group-orders", {
      method: "POST",
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      body: {
        productId: product.value.id,
        couponId,
        creatorId: auth.user.id,
        frontendUrl: window.location.origin,
      },
    });
    groupInviteLinks.value = {
      ...groupInviteLinks.value,
      [couponId]: `${window.location.origin}/invite/${res.conversation.invitelink}`,
    };
  } catch (e) {
    alert("Không thể tạo nhóm: " + (e?.data?.message || e.message));
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

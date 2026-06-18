<template>
  <div class="min-h-screen bg-gray-50 text-gray-900 pb-20">

    <!-- HERO -->
    <section class="bg-white border-b border-gray-100 py-14 px-4">
      <div class="container mx-auto max-w-3xl text-center">
        <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-500 rounded-full text-xs font-medium mb-6 border border-gray-200">
          <CodeBracketIcon class="w-3.5 h-3.5" />
          Dự án cá nhân
        </div>
        <h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">Về SocialShop</h1>
        <p class="text-gray-500 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
          Nền tảng mua sắm cộng đồng được xây dựng từ đầu cuối, tích hợp tính năng xã hội, mua theo nhóm và thử đồ ảo bằng AI.
        </p>
      </div>
    </section>

    <!-- MỤC TIÊU + CÔNG NGHỆ -->
    <section class="py-10 px-4">
      <div class="container mx-auto max-w-5xl">
        <div class="grid md:grid-cols-2 gap-6">

          <div class="bg-white rounded-xl border border-gray-200 p-6">
            <div class="flex items-center gap-2.5 mb-3">
              <LightBulbIcon class="w-5 h-5 text-gray-500" />
              <h2 class="font-bold text-gray-900">Mục tiêu dự án</h2>
            </div>
            <p class="text-gray-500 text-sm leading-relaxed">
              Thực hành xây dựng một ứng dụng fullstack hoàn chỉnh từ cơ sở dữ liệu, API đến giao diện người dùng. Dự án bao gồm xác thực, quản lý đơn hàng, chat thời gian thực và tích hợp AI thử đồ ảo.
            </p>
          </div>

          <div class="bg-white rounded-xl border border-gray-200 p-6">
            <div class="flex items-center gap-2.5 mb-3">
              <WrenchScrewdriverIcon class="w-5 h-5 text-gray-500" />
              <h2 class="font-bold text-gray-900">Công nghệ sử dụng</h2>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="tech in techStack"
                :key="tech"
                class="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md border border-gray-200"
              >
                {{ tech }}
              </span>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- TÍNH NĂNG NỔI BẬT -->
    <section class="py-10 px-4">
      <div class="container mx-auto max-w-5xl">

        <div class="text-center mb-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-1">Tính năng nổi bật</h2>
          <p class="text-gray-400 text-sm">Những tính năng được xây dựng trong dự án</p>
        </div>

        <!-- 2 tính năng chính -->
        <div class="grid md:grid-cols-2 gap-5 mb-5">

          <div class="bg-white rounded-xl border border-emerald-200 p-6 flex flex-col gap-4">
            <div class="flex items-start gap-4">
              <div class="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <UserGroupIcon class="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="font-bold text-gray-900">Mua chung theo nhóm</h3>
                  <span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">Nổi bật</span>
                </div>
                <p class="text-sm text-gray-500 leading-relaxed">
                  Tạo nhóm mua sắm bằng mã coupon nhóm. Mỗi người tự chọn size và màu sắc riêng, trưởng nhóm thanh toán một lần, hệ thống tự tạo đơn hàng độc lập cho từng thành viên.
                </p>
              </div>
            </div>
            <NuxtLink to="/group-buying-guide"
              class="self-start inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors">
              Xem hướng dẫn <ArrowRightIcon class="w-3 h-3" />
            </NuxtLink>
          </div>

          <div class="bg-white rounded-xl border border-blue-200 p-6 flex flex-col gap-4">
            <div class="flex items-start gap-4">
              <div class="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <SparklesIcon class="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="font-bold text-gray-900">Thử đồ ảo</h3>
                  <span class="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full border border-blue-200">AI</span>
                </div>
                <p class="text-sm text-gray-500 leading-relaxed">
                  Tải ảnh cá nhân lên, chọn màu sản phẩm và xem kết quả trong vài giây. AI tự động ghép quần áo lên hình của bạn. Hỗ trợ tải về và chia sẻ lên bài viết hoặc chat.
                </p>
              </div>
            </div>
            <NuxtLink to="/virtual-try-on-guide"
              class="self-start inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
              Xem hướng dẫn <ArrowRightIcon class="w-3 h-3" />
            </NuxtLink>
          </div>

        </div>

        <!-- 6 tính năng phụ -->
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="feature in secondaryFeatures"
            :key="feature.title"
            class="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-3 hover:border-gray-300 transition-colors"
          >
            <div class="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <component :is="feature.icon" class="w-4.5 h-4.5 text-gray-600" style="width: 18px; height: 18px;" />
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 text-sm mb-1">{{ feature.title }}</h3>
              <p class="text-xs text-gray-500 leading-relaxed">{{ feature.desc }}</p>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- CTA -->
    <section class="py-10 px-4">
      <div class="container mx-auto max-w-3xl">
        <div class="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <h3 class="font-bold text-gray-900 mb-2">Muốn trải nghiệm trực tiếp?</h3>
          <p class="text-gray-400 text-sm mb-5">Khám phá sản phẩm và thử các tính năng ngay trên SocialShop</p>
          <NuxtLink to="/"
            class="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition text-sm">
            <ShoppingBagIcon class="w-4 h-4" />
            Khám phá sản phẩm
          </NuxtLink>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import {
  CodeBracketIcon,
  LightBulbIcon,
  WrenchScrewdriverIcon,
  UserGroupIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ChatBubbleLeftRightIcon,
  TicketIcon,
  StarIcon,
  ArrowRightIcon,
  ShoppingBagIcon,
  NewspaperIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/vue/24/outline';

useHead({
  title: 'Về dự án - SocialShop',
  meta: [
    {
      name: 'description',
      content: 'SocialShop là dự án cá nhân về nền tảng mua sắm cộng đồng với tính năng mua chung, thử đồ ảo AI, chat thời gian thực và nhiều hơn nữa.',
    },
  ],
});

const techStack = [
  'Nuxt 3', 'Vue 3', 'TailwindCSS', 'Pinia',
  'Node.js', 'Express.js', 'Drizzle ORM', 'PostgreSQL',
  'Supabase', 'JWT', 'Socket.io', 'TensorFlow.js', 'PayPal',
];

const secondaryFeatures = [
  {
    icon: ChatBubbleLeftRightIcon,
    title: 'Chat thời gian thực',
    desc: 'Nhắn tin với bạn bè, chia sẻ sản phẩm và hình ảnh. Phòng chat nhóm tự động tạo khi tham gia mua chung.',
  },
  {
    icon: TicketIcon,
    title: 'Mã giảm giá',
    desc: 'Coupon cá nhân và coupon nhóm. Hệ thống gợi ý mã phù hợp ngay trên trang sản phẩm.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Thanh toán đa dạng',
    desc: 'Hỗ trợ PayPal (quét mã QR) và COD. Quản lý trạng thái đơn hàng rõ ràng từng bước.',
  },
  {
    icon: NewspaperIcon,
    title: 'Mạng xã hội mua sắm',
    desc: 'Đăng bài, tag sản phẩm, kết bạn, like và bình luận như các mạng xã hội phổ biến.',
  },
  {
    icon: StarIcon,
    title: 'Đánh giá sản phẩm',
    desc: 'Để lại đánh giá kèm ảnh và video sau khi mua hàng. Điểm trung bình hiển thị trên trang sản phẩm.',
  },
  {
    icon: ClipboardDocumentListIcon,
    title: 'Quản lý đơn hàng',
    desc: 'Theo dõi lịch sử đơn hàng. Giao diện quản lý riêng dành cho staff và admin.',
  },
];
</script>

<template>
  <div class="min-h-screen bg-gray-50 text-gray-900 pb-20">

    <!-- HERO SECTION -->
    <section class="bg-white py-12 px-4 border-b border-gray-100">
      <div class="container mx-auto max-w-4xl text-center">
        <div class="inline-flex items-center justify-center w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl mb-5 border border-blue-100">
          <SparklesIcon class="w-7 h-7" />
        </div>
        <h1 class="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
          Hướng Dẫn Thử Đồ Ảo AI
        </h1>
        <p class="text-gray-500 text-lg max-w-2xl mx-auto">
          Dùng trí tuệ nhân tạo để thấy bạn trông như thế nào khi mặc sản phẩm mà không cần ra khỏi nhà. Chỉ cần một tấm ảnh, kết quả hiện ra trong vài giây.
        </p>
      </div>
    </section>

    <!-- HIGHLIGHTS SECTION -->
    <section class="py-14 px-4 bg-white border-b border-gray-100">
      <div class="container mx-auto max-w-5xl">
        <div class="grid md:grid-cols-3 gap-6">

          <div class="bg-gray-50 rounded-xl border border-gray-100 p-6 flex flex-col items-center text-center">
            <div class="bg-white text-gray-800 p-3 rounded-xl mb-4 shadow-sm border border-gray-200">
              <CameraIcon class="w-6 h-6" />
            </div>
            <h3 class="font-bold text-gray-900 text-lg mb-2">Tải ảnh của bạn</h3>
            <p class="text-sm text-gray-600 leading-relaxed">Chụp ảnh toàn thân hoặc nửa người, nền sáng. AI sẽ phát hiện và xác nhận ảnh hợp lệ tự động.</p>
          </div>

          <div class="bg-gray-50 rounded-xl border border-gray-100 p-6 flex flex-col items-center text-center">
            <div class="bg-white text-gray-800 p-3 rounded-xl mb-4 shadow-sm border border-gray-200">
              <SwatchIcon class="w-6 h-6" />
            </div>
            <h3 class="font-bold text-gray-900 text-lg mb-2">Chọn màu sắc</h3>
            <p class="text-sm text-gray-600 leading-relaxed">Chọn màu variant của sản phẩm muốn thử. Ảnh sản phẩm tương ứng sẽ tự động cập nhật để ghép với ảnh của bạn.</p>
          </div>

          <div class="bg-gray-50 rounded-xl border border-gray-100 p-6 flex flex-col items-center text-center">
            <div class="bg-white text-gray-800 p-3 rounded-xl mb-4 shadow-sm border border-gray-200">
              <PhotoIcon class="w-6 h-6" />
            </div>
            <h3 class="font-bold text-gray-900 text-lg mb-2">Xem kết quả ngay</h3>
            <p class="text-sm text-gray-600 leading-relaxed">AI ghép ảnh và trả về kết quả trong vài giây. Tải về hoặc chia sẻ trực tiếp lên bài viết và cuộc trò chuyện.</p>
          </div>

        </div>
      </div>
    </section>

    <!-- STEP BY STEP SECTION -->
    <section class="py-12 px-4">
      <div class="container mx-auto max-w-4xl">
        <h2 class="text-2xl font-bold text-center text-gray-900 mb-10">Các bước thực hiện</h2>

        <div class="bg-white rounded-xl border border-blue-100 p-6 md:p-8">
          <ul class="space-y-8">

            <li class="flex gap-4 md:gap-6">
              <div class="flex-shrink-0 flex items-start">
                <div class="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">1</div>
              </div>
              <div class="pt-1">
                <h3 class="font-semibold text-gray-900">Vào trang sản phẩm, nhấn nút "Thử sản phẩm"</h3>
                <p class="text-sm text-gray-600 mt-1 leading-relaxed">
                  Trên trang chi tiết sản phẩm, cuộn xuống vùng nút hành động. Nhấn nút
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-700 text-white text-xs rounded font-medium">
                    <SparklesIcon class="w-3 h-3" /> Thử sản phẩm
                  </span>
                  để mở giao diện thử đồ. Lưu ý: cần đăng nhập để sử dụng tính năng này.
                </p>
              </div>
            </li>

            <li class="flex gap-4 md:gap-6">
              <div class="flex-shrink-0 flex items-start">
                <div class="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">2</div>
              </div>
              <div class="pt-1">
                <h3 class="font-semibold text-gray-900">Chọn màu sắc muốn thử</h3>
                <p class="text-sm text-gray-600 mt-1 leading-relaxed">
                  Trong popup thử đồ, chọn một màu variant ở phần bên trái. Ảnh sản phẩm tương ứng với màu đó sẽ hiển thị để bạn xác nhận trước khi thử.
                </p>
              </div>
            </li>

            <li class="flex gap-4 md:gap-6">
              <div class="flex-shrink-0 flex items-start">
                <div class="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">3</div>
              </div>
              <div class="pt-1">
                <h3 class="font-semibold text-gray-900">Tải ảnh của bạn lên</h3>
                <p class="text-sm text-gray-600 mt-1 leading-relaxed">
                  Nhấn vào vùng "Ảnh của bạn" để chọn ảnh từ thiết bị. AI sẽ tự động kiểm tra ảnh. Nếu hợp lệ (phát hiện đúng 1 người) sẽ hiện dấu ✓ xanh. Nếu không hợp lệ, hãy thử ảnh khác.
                </p>
              </div>
            </li>

            <li class="flex gap-4 md:gap-6">
              <div class="flex-shrink-0 flex items-start">
                <div class="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">4</div>
              </div>
              <div class="pt-1">
                <h3 class="font-semibold text-gray-900">Nhấn "Thử ngay" và chờ AI xử lý</h3>
                <p class="text-sm text-gray-600 mt-1 leading-relaxed">
                  Khi đã chọn màu và ảnh hợp lệ, nút <strong>"Thử ngay"</strong> sẽ sáng lên. Nhấn vào và đợi vài giây. Đồng hồ đếm thời gian xử lý sẽ hiển thị trực tiếp trên màn hình.
                </p>
              </div>
            </li>

            <li class="flex gap-4 md:gap-6">
              <div class="flex-shrink-0 flex items-start">
                <div class="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">5</div>
              </div>
              <div class="pt-1">
                <h3 class="font-semibold text-gray-900">Tải về hoặc chia sẻ kết quả</h3>
                <p class="text-sm text-gray-600 mt-1 leading-relaxed">
                  Sau khi có kết quả, bạn có thể:
                </p>
                <ul class="mt-2 space-y-1.5 text-sm text-gray-600">
                  <li class="flex items-center gap-2">
                    <ArrowDownTrayIcon class="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span><strong>Tải ảnh</strong> về máy để lưu lại</span>
                  </li>
                  <li class="flex items-center gap-2">
                    <PencilSquareIcon class="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span><strong>Tạo bài viết</strong> chia sẻ lên mạng xã hội trong ứng dụng</span>
                  </li>
                  <li class="flex items-center gap-2">
                    <ChatBubbleLeftEllipsisIcon class="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span><strong>Gửi vào cuộc trò chuyện</strong> để hỏi ý kiến bạn bè</span>
                  </li>
                </ul>
              </div>
            </li>

          </ul>
        </div>
      </div>
    </section>

    <!-- TIPS SECTION -->
    <section class="py-10 px-4">
      <div class="container mx-auto max-w-4xl">
        <div class="bg-white rounded-xl border border-amber-200 p-6 md:p-8">
          <div class="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
            <div class="bg-amber-50 text-amber-600 p-2 rounded-lg">
              <LightBulbIcon class="w-5 h-5" />
            </div>
            <h2 class="text-xl font-bold text-gray-900">Yêu cầu ảnh để có kết quả tốt nhất</h2>
          </div>
          <div class="grid sm:grid-cols-2 gap-4">
            <div v-for="tip in tips" :key="tip.text" class="flex items-start gap-3">
              <component :is="tip.icon" class="w-5 h-5 mt-0.5 flex-shrink-0" :class="tip.color" />
              <p class="text-sm text-gray-700 leading-relaxed">{{ tip.text }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ SECTION -->
    <section class="py-12 px-4">
      <div class="container mx-auto max-w-3xl">
        <h2 class="text-2xl font-bold text-center text-gray-900 mb-8">Câu hỏi thường gặp</h2>

        <div class="space-y-3">
          <div
            v-for="(faq, index) in faqs"
            :key="index"
            class="bg-white border border-gray-200 rounded-lg overflow-hidden"
          >
            <button
              class="w-full text-left px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 focus:outline-none"
              @click="toggleFaq(index)"
            >
              <span class="font-semibold text-gray-900 text-sm">{{ faq.q }}</span>
              <ChevronDownIcon
                class="w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0"
                :class="openFaq === index ? 'rotate-180' : ''"
              />
            </button>
            <div
              v-show="openFaq === index"
              class="px-6 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4"
            >
              {{ faq.a }}
            </div>
          </div>
        </div>

        <!-- CTA -->
        <div class="mt-12 text-center">
          <p class="text-gray-500 mb-4 text-sm">Sẵn sàng thử chưa? Chọn một sản phẩm và trải nghiệm ngay!</p>
          <NuxtLink
            to="/"
            class="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white font-medium rounded hover:bg-gray-800 transition"
          >
            <ShoppingBagIcon class="w-4 h-4" />
            Xem sản phẩm để thử ngay
          </NuxtLink>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref } from 'vue';
import {
  SparklesIcon,
  CameraIcon,
  SwatchIcon,
  PhotoIcon,
  ChevronDownIcon,
  LightBulbIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  PencilSquareIcon,
  ChatBubbleLeftEllipsisIcon,
  ShoppingBagIcon,
  UserIcon,
  SunIcon,
} from '@heroicons/vue/24/outline';

useHead({
  title: 'Hướng dẫn Thử Đồ Ảo AI - SocialShop',
  meta: [
    {
      name: 'description',
      content: 'Tìm hiểu cách sử dụng tính năng Thử Đồ Ảo AI trên SocialShop. Chỉ cần tải ảnh, chọn màu sắc và xem kết quả trong vài giây.',
    },
  ],
});

const openFaq = ref(null);

const toggleFaq = (index) => {
  openFaq.value = openFaq.value === index ? null : index;
};

const tips = [
  {
    icon: UserIcon,
    color: 'text-blue-600',
    text: 'Chỉ có đúng 1 người trong ảnh. AI sẽ từ chối nếu phát hiện nhiều hơn hoặc không có ai.',
  },
  {
    icon: CameraIcon,
    color: 'text-blue-600',
    text: 'Ảnh chụp toàn thân hoặc từ eo trở lên là lý tưởng nhất để AI ghép quần áo chính xác.',
  },
  {
    icon: SunIcon,
    color: 'text-amber-500',
    text: 'Nền sáng, ít chi tiết phức tạp giúp AI tách người khỏi nền dễ dàng hơn.',
  },
  {
    icon: CheckCircleIcon,
    color: 'text-green-600',
    text: 'Ảnh rõ nét, không bị mờ hoặc tối. Hỗ trợ định dạng JPG, PNG, WebP, tối đa 10MB.',
  },
  {
    icon: ExclamationTriangleIcon,
    color: 'text-amber-500',
    text: 'Tránh ảnh chụp nghiêng quá nhiều, ảnh nhóm, hoặc ảnh có người bị che khuất.',
  },
  {
    icon: CheckCircleIcon,
    color: 'text-green-600',
    text: 'Ảnh chụp đứng thẳng, nhìn thẳng vào camera cho kết quả ghép tự nhiên và đẹp nhất.',
  },
];

const faqs = [
  {
    q: 'Tính năng Thử Đồ Ảo AI có mất phí không?',
    a: 'Hoàn toàn miễn phí cho tất cả khách hàng đã đăng nhập. Bạn chỉ cần có tài khoản và vào trang chi tiết sản phẩm là có thể dùng ngay.',
  },
  {
    q: 'Ảnh tôi tải lên có được lưu trữ lại không?',
    a: 'Không. Ảnh của bạn chỉ được xử lý tạm thời trong phiên làm việc để tạo kết quả thử đồ. Chúng tôi không lưu trữ ảnh cá nhân của bạn trên máy chủ.',
  },
  {
    q: 'Tại sao ảnh tôi bị báo không hợp lệ?',
    a: 'Hệ thống dùng AI để phát hiện người trong ảnh. Ảnh sẽ bị từ chối nếu: không có người, có nhiều hơn 1 người, ảnh quá mờ/tối, hoặc người bị che khuất quá nhiều. Hãy thử lại với ảnh rõ nét hơn, chụp 1 mình bạn.',
  },
  {
    q: 'Kết quả thử đồ trông chưa thật thì sao?',
    a: 'Đây là công nghệ AI và kết quả chỉ mang tính minh họa. Chất lượng phụ thuộc vào ảnh đầu vào. Ảnh toàn thân, nền sáng, đứng thẳng thường cho kết quả tốt hơn. Nếu kết quả chưa ưng, hãy thử đổi ảnh hoặc chọn màu sản phẩm khác.',
  },
  {
    q: 'Tôi có thể thử nhiều màu sắc khác nhau không?',
    a: 'Có! Bạn có thể thay đổi màu sắc bất kỳ lúc nào trong cùng một phiên thử đồ. Chỉ cần chọn màu mới và nhấn "Thử ngay" lại là được.',
  },
];
</script>

<template>
  <div class="min-h-screen bg-gray-50 text-gray-900 pb-20">
    <!-- HERO SECTION -->
    <section class="bg-white py-12 px-4">
      <div class="container mx-auto max-w-4xl text-center">
        <h1 class="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
          Hướng Dẫn Sử Dụng Tính Năng Mua Chung
        </h1>
        <p class="text-gray-500 text-lg max-w-2xl mx-auto">
          Cùng bạn bè mua sắm với giá tốt hơn, phòng chat riêng biệt và linh hoạt lựa chọn sản phẩm cho từng cá nhân. Dưới đây là các điểm sáng và quyền hạn chi tiết.
        </p>
      </div>
    </section>

    <!-- HIGHLIGHTS SECTION -->
    <section class="pb-14 px-4 border-b border-gray-200 bg-white">
      <div class="container mx-auto max-w-5xl">
        <div class="grid md:grid-cols-3 gap-6">
          <div class="bg-gray-50 rounded-xl border border-gray-100 p-6 flex flex-col items-center text-center">
            <div class="bg-white text-gray-800 p-3 rounded-xl mb-4 shadow-sm border border-gray-200">
              <TicketIcon class="w-6 h-6" />
            </div>
            <h3 class="font-bold text-gray-900 text-lg mb-2">Ưu đãi độc quyền</h3>
            <p class="text-sm text-gray-600 leading-relaxed">Sử dụng mã giảm giá nhóm để mua sản phẩm với mức giá hấp dẫn hơn nhiều so với mua lẻ.</p>
          </div>
          
          <div class="bg-gray-50 rounded-xl border border-gray-100 p-6 flex flex-col items-center text-center">
            <div class="bg-white text-gray-800 p-3 rounded-xl mb-4 shadow-sm border border-gray-200">
              <CubeTransparentIcon class="w-6 h-6" />
            </div>
            <h3 class="font-bold text-gray-900 text-lg mb-2">Đơn hàng riêng biệt</h3>
            <p class="text-sm text-gray-600 leading-relaxed">Dù cùng một nhóm, mỗi người vẫn được tự do chọn size, màu sắc và tự động tạo đơn hàng riêng.</p>
          </div>

          <div class="bg-gray-50 rounded-xl border border-gray-100 p-6 flex flex-col items-center text-center">
            <div class="bg-white text-gray-800 p-3 rounded-xl mb-4 shadow-sm border border-gray-200">
              <ChatBubbleLeftEllipsisIcon class="w-6 h-6" />
            </div>
            <h3 class="font-bold text-gray-900 text-lg mb-2">Phòng chat tiện lợi</h3>
            <p class="text-sm text-gray-600 leading-relaxed">Nhóm chat được tạo tự động giúp mọi người dễ dàng trao đổi, nhắc nhở và theo dõi tiến độ.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ROLES SECTION -->
    <section class="py-12 px-4">
      <div class="container mx-auto max-w-5xl">
        <div class="grid md:grid-cols-2 gap-8">
          
          <!-- TRƯỞNG NHÓM -->
          <div class="bg-white rounded-xl border border-emerald-200 p-6 md:p-8">
            <div class="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
              <div class="bg-emerald-100 text-emerald-700 p-2 rounded-lg">
                <UserCircleIcon class="w-6 h-6" />
              </div>
              <h2 class="text-2xl font-bold text-gray-900">Vai trò Trưởng Nhóm</h2>
            </div>

            <ul class="space-y-6">
              <li class="flex gap-4">
                <div class="mt-1 flex-shrink-0 text-emerald-600">
                  <UserPlusIcon class="w-6 h-6" />
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900">Tạo nhóm & Mời bạn bè</h3>
                  <p class="text-sm text-gray-600 mt-1">
                    Nhận mã coupon từ trang sản phẩm (chọn "Tạo nhóm") để mở phòng chat mua chung. Trong khung chat, nhấp vào biểu tượng ℹ️ chọn "Thành viên nhóm" để lấy link mời.
                  </p>
                </div>
              </li>

              <li class="flex gap-4">
                <div class="mt-1 flex-shrink-0 text-emerald-600">
                  <ArrowsRightLeftIcon class="w-6 h-6" />
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900">Đổi sản phẩm mua chung</h3>
                  <p class="text-sm text-gray-600 mt-1">
                    Có quyền đổi sang sản phẩm khác khi nhóm đang mở hoặc đã đủ người. <strong>Lưu ý:</strong> Việc này sẽ làm mới toàn bộ lựa chọn phân loại của các thành viên.
                  </p>
                </div>
              </li>

              <li class="flex gap-4">
                <div class="mt-1 flex-shrink-0 text-emerald-600">
                  <ShoppingBagIcon class="w-6 h-6" />
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900">Chọn phân loại sản phẩm</h3>
                  <p class="text-sm text-gray-600 mt-1">
                    Trưởng nhóm cũng cần tự chọn size, màu sắc và số lượng cho đơn hàng của riêng mình giống như các thành viên khác.
                  </p>
                </div>
              </li>

              <li class="flex gap-4">
                <div class="mt-1 flex-shrink-0 text-emerald-600">
                  <CheckCircleIcon class="w-6 h-6" />
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900">Đặt đơn & Thanh toán</h3>
                  <p class="text-sm text-gray-600 mt-1">
                    Khi tất cả đã chọn xong, nút <strong>"Đặt đơn nhóm"</strong> sẽ hiển thị. Trưởng nhóm tiến hành thanh toán Online (Quét mã QR) hoặc chọn Thanh toán khi nhận hàng (COD) cho toàn bộ nhóm.
                  </p>
                </div>
              </li>

              <li class="flex gap-4">
                <div class="mt-1 flex-shrink-0 text-emerald-600">
                  <XMarkIcon class="w-6 h-6" />
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900">Huỷ đơn & Giải tán nhóm</h3>
                  <p class="text-sm text-gray-600 mt-1">
                    Có thể giải tán nhóm bất cứ lúc nào (trừ lúc đang xử lý đơn). Có quyền huỷ đơn khi đơn đang trong trạng thái chờ thanh toán hoặc đang xử lý.
                  </p>
                </div>
              </li>
            </ul>
          </div>

          <!-- THÀNH VIÊN -->
          <div class="bg-white rounded-xl border border-blue-200 p-6 md:p-8">
            <div class="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
              <div class="bg-blue-100 text-blue-700 p-2 rounded-lg">
                <UsersIcon class="w-6 h-6" />
              </div>
              <h2 class="text-2xl font-bold text-gray-900">Vai trò Thành Viên</h2>
            </div>

            <ul class="space-y-6">
              <li class="flex gap-4">
                <div class="mt-1 flex-shrink-0 text-blue-600">
                  <ArrowRightOnRectangleIcon class="w-6 h-6" />
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900">Tham gia nhóm</h3>
                  <p class="text-sm text-gray-600 mt-1">
                    Chỉ cần nhấp vào link mời từ trưởng nhóm, bạn sẽ tự động được thêm vào phòng chat chung để theo dõi và trao đổi.
                  </p>
                </div>
              </li>

              <li class="flex gap-4">
                <div class="mt-1 flex-shrink-0 text-blue-600">
                  <ShoppingBagIcon class="w-6 h-6" />
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900">Chọn phân loại cho bản thân</h3>
                  <p class="text-sm text-gray-600 mt-1">
                    Nhấp vào nút <strong>"Chọn"</strong> trong phòng chat để chọn size và màu sắc. Khi trưởng nhóm đặt hàng thành công, hệ thống sẽ tạo một đơn hàng độc lập cho bạn.
                  </p>
                </div>
              </li>

              <li class="flex gap-4">
                <div class="mt-1 flex-shrink-0 text-blue-600">
                  <ArrowLeftOnRectangleIcon class="w-6 h-6" />
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900">Rời nhóm</h3>
                  <p class="text-sm text-gray-600 mt-1">
                    Bạn có thể tự do rời nhóm nếu đổi ý, ngoại trừ lúc trưởng nhóm đang trong quá trình thao tác đặt và thanh toán đơn.
                  </p>
                </div>
              </li>
              
              <li class="flex gap-4">
                <div class="mt-1 flex-shrink-0 text-blue-600">
                  <ChatBubbleLeftRightIcon class="w-6 h-6" />
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900">Trao đổi & Thống nhất</h3>
                  <p class="text-sm text-gray-600 mt-1">
                    Phòng chat là nơi lý tưởng để cả nhóm thảo luận, chia sẻ hình ảnh và nhắc nhở nhau hoàn tất việc chọn sản phẩm để trưởng nhóm nhanh chóng chốt đơn.
                  </p>
                </div>
              </li>
            </ul>
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
                class="w-5 h-5 text-gray-400 transition-transform duration-200"
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
        
        <div class="mt-12 text-center">
          <NuxtLink
            to="/"
            class="inline-block px-6 py-2.5 bg-gray-900 text-white font-medium rounded hover:bg-gray-800 transition"
          >
            Về trang chủ mua sắm
          </NuxtLink>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref } from 'vue';
import {
  UserCircleIcon,
  UsersIcon,
  UserPlusIcon,
  ArrowsRightLeftIcon,
  ShoppingBagIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
  ChevronDownIcon,
  ChatBubbleLeftRightIcon,
  TicketIcon,
  CubeTransparentIcon,
  ChatBubbleLeftEllipsisIcon
} from '@heroicons/vue/24/outline';

useHead({
  title: "Hướng dẫn Mua Chung - SocialShop",
  meta: [
    {
      name: "description",
      content: "Chi tiết quyền hạn và các thao tác dành cho Trưởng nhóm và Thành viên khi tham gia Mua Chung trên SocialShop.",
    },
  ],
});

const openFaq = ref(null);

const toggleFaq = (index) => {
  openFaq.value = openFaq.value === index ? null : index;
};

const faqs = [
  {
    q: "Ai có thể tạo nhóm mua chung?",
    a: "Bất kỳ khách hàng nào có tài khoản đều có thể tạo nhóm bằng mã coupon nhóm. Lưu ý: Tài khoản nhân viên và quản trị viên (Admin) không được sử dụng tính năng này.",
  },
  {
    q: "Thanh toán đơn hàng nhóm như thế nào?",
    a: "Trưởng nhóm là người duy nhất chịu trách nhiệm thanh toán toàn bộ giá trị đơn hàng của nhóm. Hệ thống hỗ trợ thanh toán qua mã QR hoặc COD. Việc chia sẻ chi phí là thỏa thuận nội bộ giữa các thành viên.",
  },
  {
    q: "Tôi có thể rời nhóm bất cứ lúc nào không?",
    a: "Có, bạn có thể rời nhóm khi nhóm đang mở, đã đủ người, hoàn tất hoặc bị hủy. Tuy nhiên, nếu trưởng nhóm đang tiến hành thanh toán và đặt hàng, bạn sẽ không thể rời đi.",
  },
  {
    q: "Điều kiện để nhóm có thể đặt hàng là gì?",
    a: "Nhóm cần đạt đủ số lượng thành viên tối thiểu quy định bởi coupon và tất cả mọi người trong nhóm (bao gồm cả trưởng nhóm) phải chọn xong phân loại sản phẩm của mình.",
  }
];
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-20 max-w-5xl">
      <div class="bg-white rounded-xl shadow-lg p-12 md:p-16">
        <div class="text-center mb-16">
          <h1 class="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Về chúng tôi
          </h1>
          <p class="text-xl text-gray-600">Ứng dụng mua sắm xã hội hàng đầu</p>
        </div>

        <div class="grid md:grid-cols-2 gap-12 mb-16">
          <div>
            <h2 class="text-2xl font-semibold text-gray-900 mb-6">Sứ mệnh</h2>
            <p class="text-gray-700 leading-relaxed text-lg">
              Chúng tôi cam kết mang đến trải nghiệm mua sắm xã hội tuyệt vời
              nhất, kết nối người dùng qua việc chia sẻ và khám phá các sản phẩm
              yêu thích.
            </p>
          </div>

          <div>
            <h2 class="text-2xl font-semibold text-gray-900 mb-6">Tầm nhìn</h2>
            <p class="text-gray-700 leading-relaxed text-lg">
              Trở thành nền tảng mua sắm xã hội hàng đầu, nơi mọi người có thể
              kết nối, chia sẻ và cùng nhau khám phá những sản phẩm tốt nhất.
            </p>
          </div>
        </div>

        <div class="border-t pt-12">
          <h2 class="text-2xl font-semibold text-gray-900 mb-10 text-center">
            Tính năng nổi bật
          </h2>
          <div class="grid md:grid-cols-3 gap-8">
            <div class="text-center p-8 bg-gray-50 rounded-lg">
              <div
                class="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center"
              >
                <svg
                  class="w-10 h-10 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  ></path>
                </svg>
              </div>
              <h3 class="font-semibold text-gray-900 mb-3 text-lg">
                Kết nối bạn bè
              </h3>
              <p class="text-gray-600">
                Kết bạn và chia sẻ trải nghiệm mua sắm
              </p>
            </div>

            <div class="text-center p-8 bg-gray-50 rounded-lg">
              <div
                class="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center"
              >
                <svg
                  class="w-10 h-10 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  ></path>
                </svg>
              </div>
              <h3 class="font-semibold text-gray-900 mb-3 text-lg">
                Mua sắm nhóm
              </h3>
              <p class="text-gray-600">
                Mua sắm cùng bạn bè để được giá tốt hơn
              </p>
            </div>

            <div class="text-center p-8 bg-gray-50 rounded-lg">
              <div
                class="w-20 h-20 mx-auto mb-6 rounded-full bg-purple-100 flex items-center justify-center"
              >
                <svg
                  class="w-10 h-10 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  ></path>
                </svg>
              </div>
              <h3 class="font-semibold text-gray-900 mb-3 text-lg">
                Chia sẻ đánh giá
              </h3>
              <p class="text-gray-600">
                Chia sẻ trải nghiệm và đánh giá sản phẩm
              </p>
            </div>
          </div>
        </div>

        <div class="text-center mt-16">
          <NuxtLink
            to="/"
            class="inline-flex items-center px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition"
          >
            Khám phá ngay
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// SEO
useHead({
  title: "Về chúng tôi - Social Shopping",
});
</script>

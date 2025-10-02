<template>
  <div
    class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8"
  >
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h2 class="text-center text-3xl font-extrabold text-gray-900">
        Đăng ký tài khoản
      </h2>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10">
        <form class="space-y-6" @submit.prevent="onSubmit">
          <!-- Họ và tên -->
          <div>
            <label class="block text-sm font-medium text-gray-700">
              Họ và tên
            </label>
            <div class="mt-1">
              <input
                v-model="form.fullName"
                type="text"
                required
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
          </div>

          <!-- Email -->
          <div>
            <label class="block text-sm font-medium text-gray-700">
              Email
            </label>
            <div class="mt-1">
              <input
                v-model="form.email"
                type="email"
                required
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
          </div>

          <!-- Mật khẩu -->
          <div>
            <label class="block text-sm font-medium text-gray-700">
              Mật khẩu
            </label>
            <div class="mt-1">
              <input
                v-model="form.password"
                type="password"
                required
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
          </div>

          <!-- Số điện thoại -->
          <div>
            <label class="block text-sm font-medium text-gray-700">
              Số điện thoại
            </label>
            <div class="mt-1">
              <input
                v-model="form.phone"
                type="tel"
                required
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
          </div>

          <!-- Giới tính -->
          <div>
            <label class="block text-sm font-medium text-gray-700">
              Giới tính
            </label>
            <div class="mt-1">
              <select
                v-model="form.gender"
                class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              >
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
              </select>
            </div>
          </div>

          <!-- Ngày sinh -->
          <div>
            <label class="block text-sm font-medium text-gray-700">
              Ngày sinh
            </label>
            <div class="mt-1">
              <input
                v-model="form.dateOfBirth"
                type="date"
                required
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
          </div>

          <!-- Tỉnh/Thành phố -->
          <div>
            <label class="block text-sm font-medium text-gray-700">
              Tỉnh/Thành phố
            </label>
            <div class="mt-1">
              <input
                v-model="form.province"
                type="text"
                placeholder="Nhập Tỉnh/Thành phố"
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
          </div>

          <!-- Quận/Huyện -->
          <div>
            <label class="block text-sm font-medium text-gray-700">
              Quận/Huyện
            </label>
            <div class="mt-1">
              <input
                v-model="form.district"
                type="text"
                placeholder="Nhập Quận/Huyện"
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
          </div>

          <!-- Phường/Xã -->
          <div>
            <label class="block text-sm font-medium text-gray-700">
              Phường/Xã
            </label>
            <div class="mt-1">
              <input
                v-model="form.ward"
                type="text"
                placeholder="Nhập Phường/Xã"
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
          </div>

          <!-- Địa chỉ chi tiết -->
          <div>
            <label class="block text-sm font-medium text-gray-700">
              Địa chỉ chi tiết
            </label>
            <div class="mt-1">
              <textarea
                v-model="form.addressDetail"
                rows="3"
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              ></textarea>
            </div>
          </div>

          <div>
            <button
              type="submit"
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
            >
              Đăng ký
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const form = reactive({
  email: "",
  password: "",
  fullName: "",
  phone: "",
  gender: "",
  dateOfBirth: "",
  province: "",
  district: "",
  ward: "",
  addressDetail: "",
});

const config = useRuntimeConfig();

const onSubmit = async () => {
  try {
    // Clone form
    const payload = { ...form };

    // Chuẩn hóa dateOfBirth
    if (payload.dateOfBirth) {
      const d = new Date(payload.dateOfBirth);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      payload.dateOfBirth = `${yyyy}-${mm}-${dd}`;
    }
    console.log("Payload gửi lên:", payload);

    const res = await $fetch("/auth/register", {
      method: "POST",
      baseURL: config.public.apiBase,
      headers: {
        "Content-Type": "application/json",
      },
      body: payload,
    });

    console.log("Đăng ký thành công:", res);
  } catch (err) {
    console.error("Lỗi đăng ký:", err);
  }
};
</script>

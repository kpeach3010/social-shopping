import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
      apiBase: process.env.NUXT_PUBLIC_API_BASE, // chỉ dùng cho API, không ảnh hưởng asset
    },
  },

  css: ["@/assets/css/main.css"],

  vite: {
    plugins: [tailwindcss()],
  },

  modules: ["@pinia/nuxt", "@nuxtjs/google-fonts"],

  googleFonts: {
    families: {
      Inter: [400, 500, 700],
      Poppins: [400, 600, 700],
    },
  },

  // Thêm cấu hình này để asset luôn load từ Vercel
  app: {
    baseURL: "/", // đường dẫn gốc cho router
    cdnURL: "https://social-shopping-app.vercel.app/_nuxt/",
  },

  build: {
    // đảm bảo publicPath trỏ về đúng domain frontend
    publicPath: "https://social-shopping-app.vercel.app/_nuxt/",
  },
});

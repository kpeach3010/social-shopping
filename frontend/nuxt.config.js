// nuxt.config.js
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      // DÙNG ENV, không hardcode
      apiBase:
        process.env.NUXT_PUBLIC_API_BASE ||
        "https://social-shopping-production.up.railway.app/api",

      // Supabase (nếu FE dùng)
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
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
    display: "swap",
  },
});

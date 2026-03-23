import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
      apiBase: process.env.NUXT_PUBLIC_API_BASE,
      baseUrl: process.env.NUXT_PUBLIC_BASE_URL || "http://localhost:3000",
    },
  },

  css: ["@/assets/css/main.css"],

  vite: {
    plugins: [tailwindcss()],
    server: {
      hmr: {
        port: 24679, // Thay đổi cổng WebSocket từ 24678 sang 24679
      },
    },
  },

  modules: ["@pinia/nuxt", "@nuxtjs/google-fonts"],

  googleFonts: {
    families: {
      Inter: [400, 500, 700],
      Poppins: [400, 600, 700],
    },
  },

  app: {
    baseURL: "/",
    head: {
      link: [
        { rel: 'icon', type: 'image/png', href: '/logo.png' }
      ]
    }
  },
});

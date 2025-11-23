// nuxt.config.js
import tailwindcss from "@tailwindcss/vite";
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      // apiBase: process.env.API_BASE || "http://localhost:5000/api",
      // socket: "~/plugins/socket.client.js",
      apiBase: "https://social-shopping-production.up.railway.app/api",
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

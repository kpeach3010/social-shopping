const config = {
  app: {
    port: process.env.PORT || 3000,
  },
  // FE URL cho invite link: ưu tiên Vercel, fallback localhost
  frontendUrl:
    process.env.FRONTEND_URL ||
    "https://social-shopping-app.vercel.app" ||
    "http://localhost:3000",
};

export default config;

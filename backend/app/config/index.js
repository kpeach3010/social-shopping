const config = {
  app: {
    port: process.env.PORT || 3000,
  },
  // FE URL cho invite link: ENV > Vercel > localhost
  frontendUrl:
    process.env.FRONTEND_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://social-shopping-app.vercel.app"
      : "http://localhost:3000"),
};

export default config;

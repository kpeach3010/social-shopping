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
  // BE URL cho PayPal return_url (phone redirect về backend)
  backendUrl:
    process.env.BACKEND_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://social-shopping-app-api.vercel.app"
      : "http://localhost:5000"),
};

export default config;

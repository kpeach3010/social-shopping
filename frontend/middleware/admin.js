import { useAuthStore } from "@/stores/auth";

export default defineNuxtRouteMiddleware((to, from) => {
  const auth = useAuthStore();
  
  // Nếu chưa đăng nhập hoặc không phải admin/staff thì chuyển về login
  if (!auth.isLoggedIn || (auth.user?.role !== "admin" && auth.user?.role !== "staff")) {
    return navigateTo("/login-page");
  }
});

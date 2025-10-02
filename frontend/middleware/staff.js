import { useAuthStore } from "@/stores/auth";
export default defineNuxtRouteMiddleware(() => {
  const auth = useAuthStore();
  if (!auth.user || auth.user.role !== "staff") {
    return navigateTo("/login-page");
  }
});

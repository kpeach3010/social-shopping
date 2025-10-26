export default defineNuxtPlugin((nuxtApp) => {
  // dam bao chi thiet lap mot lan
  if (globalThis.__fetchInterceptorSet) return;
  globalThis.__fetchInterceptorSet = true;

  const originalFetch = globalThis.$fetch;
  globalThis.$fetch = async (url, options = {}) => {
    try {
      return await originalFetch(url, options);
    } catch (err) {
      if (err?.status === 401) {
        alert("Phiên đăng nhập đã hết hạn!");
        useAuthStore().logout();
        navigateTo("/index");
      }
      throw err;
    }
  };
});

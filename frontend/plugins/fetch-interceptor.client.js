export default defineNuxtPlugin(async (nuxtApp) => {
  if (globalThis.__fetchInterceptorSet) return;
  globalThis.__fetchInterceptorSet = true;

  const pinia = nuxtApp.$pinia;
  const auth = useAuthStore(pinia);
  const chatStore = useChatStore ? useChatStore(pinia) : null;

  if (process.client) await auth.loadFromStorage();

  const originalFetch = globalThis.$fetch;

  const apiBase = useRuntimeConfig().public.apiBase;
  // 🔥 API Base tại đây = Railway backend
  // vd: https://social-shopping-production.up.railway.app/api

  globalThis.__isRefreshing = false;
  globalThis.__refreshQueue = [];

  globalThis.$fetch = async (url, options = {}) => {
    // 🔥 BẮT BUỘC gắn baseURL cho mọi request
    options.baseURL = apiBase;

    try {
      const res = await originalFetch(url, options);
      return res;
    } catch (err) {
      const status = err?.status || err?.response?.status;

      if (status !== 401) throw err;

      if (globalThis.__isRefreshing) {
        return new Promise((resolve, reject) => {
          globalThis.__refreshQueue.push({ resolve, reject, url, options });
        });
      }

      globalThis.__isRefreshing = true;

      try {
        const rt =
          auth.refreshToken ||
          (process.client ? localStorage.getItem("refreshToken") : null);

        if (!rt) {
          auth.logout();
          navigateTo("/");
          throw new Error("No refresh token available");
        }

        // 🔥 Refresh call luôn dùng Railway backend
        const refreshRes = await originalFetch("/auth/refresh-token", {
          method: "POST",
          baseURL: apiBase,
          body: { refreshToken: rt },
        });

        const newAT =
          refreshRes.accessToken ||
          refreshRes.access_token ||
          refreshRes.data?.access_token ||
          refreshRes.data?.accessToken;

        const newRT =
          refreshRes.refreshToken ||
          refreshRes.refresh_token ||
          refreshRes.data?.refresh_token ||
          refreshRes.data?.refreshToken;

        const newUser =
          refreshRes.user || refreshRes.data?.user || auth.user || null;

        if (!newAT) throw new Error("No new access token from refresh");

        auth.setAuth(newUser, newAT, newRT);

        const retryRes = await originalFetch(url, {
          ...options,
          baseURL: apiBase,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${newAT}`,
          },
        });

        globalThis.__refreshQueue.forEach(({ resolve }) => resolve(retryRes));
        globalThis.__refreshQueue = [];

        return retryRes;
      } catch (e) {
        globalThis.__refreshQueue.forEach(({ reject }) => reject(e));
        globalThis.__refreshQueue = [];
        auth.logout();
        navigateTo("/");
        throw e;
      } finally {
        globalThis.__isRefreshing = false;
      }
    }
  };
});

export default defineNuxtPlugin((nuxtApp) => {
  // Ngăn load 2 lần (HMR, SSR hydration)
  if (globalThis.__fetchInterceptorSet) return;
  globalThis.__fetchInterceptorSet = true;

  const pinia = nuxtApp.$pinia;
  const auth = useAuthStore(pinia);

  // Lấy baseURL đúng từ runtimeConfig
  const apiBase = useRuntimeConfig().public.apiBase;
  console.log("⚡ Fetch Interceptor Loaded — apiBase =", apiBase);

  const originalFetch = globalThis.$fetch;

  globalThis.__isRefreshing = false;
  globalThis.__refreshQueue = [];

  globalThis.$fetch = async (url, options = {}) => {
    // Luôn đặt baseURL đúng (chỉ 1 lần)
    options.baseURL = apiBase;

    // 🟢 luôn gắn access token
    const token = auth.accessToken || localStorage.getItem("accessToken");
    if (!options.headers) options.headers = {};
    if (token) options.headers.Authorization = `Bearer ${token}`;

    try {
      return await originalFetch(url, options);
    } catch (err) {
      const status = err?.status || err?.response?.status;

      if (status !== 401) throw err;

      // Nếu đang refresh → xếp hàng
      if (globalThis.__isRefreshing) {
        return new Promise((resolve, reject) => {
          globalThis.__refreshQueue.push({ resolve, reject, url, options });
        });
      }

      globalThis.__isRefreshing = true;

      try {
        const refreshToken =
          auth.refreshToken || localStorage.getItem("refreshToken");

        if (!refreshToken) {
          auth.logout();
          navigateTo("/");
          throw new Error("Missing refresh token");
        }

        // Gọi refresh
        const refreshRes = await originalFetch("/auth/refresh-token", {
          method: "POST",
          baseURL: apiBase,
          body: { refreshToken },
        });

        const newAT = refreshRes.accessToken || refreshRes.data?.accessToken;

        const newRT = refreshRes.refreshToken || refreshRes.data?.refreshToken;

        const newUser = refreshRes.user || refreshRes.data?.user;

        if (!newAT) throw new Error("Refresh failed");

        auth.setAuth(newUser, newAT, newRT);

        // Gửi lại request gốc
        const retry = await originalFetch(url, {
          ...options,
          baseURL: apiBase,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${newAT}`,
          },
        });

        // xử lý queue
        globalThis.__refreshQueue.forEach(({ resolve }) => resolve(retry));
        globalThis.__refreshQueue = [];

        return retry;
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

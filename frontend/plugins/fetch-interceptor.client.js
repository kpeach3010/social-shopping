// plugins/fetch-interceptor.client.js
export default defineNuxtPlugin(async (nuxtApp) => {
  // Ngăn không chạy lại
  if (globalThis.__fetchInterceptorSet) return;
  globalThis.__fetchInterceptorSet = true;

  const pinia = nuxtApp.$pinia;
  const auth = useAuthStore(pinia);
  const chatStore = useChatStore ? useChatStore(pinia) : null;

  // 🚀 LOAD TOKEN TRƯỚC KHI FETCH
  await auth.loadFromStorage();

  const originalFetch = globalThis.$fetch;
  const apiBase = useRuntimeConfig().public.apiBase;

  console.log("🔥 Interceptor ready. API =", apiBase);

  globalThis.__isRefreshing = false;
  globalThis.__refreshQueue = [];

  globalThis.$fetch = async (url, options = {}) => {
    // ==========================
    //  ALWAYS ADD BASE URL
    // ==========================
    options.baseURL = apiBase;

    // ==========================
    //  ALWAYS ADD TOKEN
    // ==========================
    const token =
      auth.accessToken ||
      (process.client ? localStorage.getItem("accessToken") : null);

    if (token) {
      options.headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      };
    }

    // ==========================
    //  CALL API
    // ==========================
    try {
      return await originalFetch(url, options);
    } catch (err) {
      const status = err?.status || err?.response?.status;

      // Không phải lỗi token → throw luôn
      if (status !== 401) throw err;

      // ==========================
      //  ĐANG REFRESH → CHỜ
      // ==========================
      if (globalThis.__isRefreshing) {
        return new Promise((resolve, reject) => {
          globalThis.__refreshQueue.push({ resolve, reject, url, options });
        });
      }

      // BẮT ĐẦU REFRESH
      globalThis.__isRefreshing = true;

      try {
        const rt =
          auth.refreshToken ||
          (process.client ? localStorage.getItem("refreshToken") : null);

        if (!rt) {
          console.warn("⚠️ No refreshToken → logout");
          auth.logout();
          navigateTo("/");
          throw new Error("NO_REFRESH_TOKEN");
        }

        // ==========================
        //  REFRESH TOKEN
        // ==========================
        const refreshRes = await originalFetch("/auth/refresh-token", {
          method: "POST",
          baseURL: apiBase,
          body: { refreshToken: rt },
        });

        const newAT =
          refreshRes.accessToken ||
          refreshRes.data?.accessToken ||
          refreshRes.data?.access_token;

        const newRT =
          refreshRes.refreshToken ||
          refreshRes.data?.refreshToken ||
          refreshRes.data?.refresh_token;

        const newUser = refreshRes.user || refreshRes.data?.user || auth.user;

        if (!newAT) {
          throw new Error("REFRESH_NO_AT");
        }

        // UPDATE AUTH STORE
        auth.setAuth(newUser, newAT, newRT);

        // ==========================
        //  RETRY REQUEST GỐC
        // ==========================
        const retryRes = await originalFetch(url, {
          ...options,
          baseURL: apiBase,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${newAT}`,
          },
        });

        // Resolve hàng đợi
        globalThis.__refreshQueue.forEach(({ resolve }) => resolve(retryRes));
        globalThis.__refreshQueue = [];

        return retryRes;
      } catch (e) {
        // Reject hàng đợi
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

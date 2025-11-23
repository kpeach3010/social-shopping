export default defineNuxtPlugin(async (nuxtApp) => {
  if (globalThis.__fetchInterceptorSet) return;
  globalThis.__fetchInterceptorSet = true;

  const pinia = nuxtApp.$pinia;
  const auth = useAuthStore(pinia);

  if (process.client) await auth.loadFromStorage();

  const originalFetch = globalThis.$fetch;
  const apiBase = useRuntimeConfig().public.apiBase;

  globalThis.__isRefreshing = false;
  globalThis.__refreshQueue = [];

  globalThis.$fetch = async (url, options = {}) => {
    // ❌ Không động vào request assets của Nuxt/Vercel
    if (typeof url === "string") {
      if (url.startsWith("/_nuxt") || url.includes("/_nuxt/")) {
        return originalFetch(url, options);
      }
    }

    // ❌ Không intercept request FULL URL không phải backend
    if (
      typeof url === "string" &&
      (url.startsWith("http://") || url.startsWith("https://"))
    ) {
      if (!url.startsWith(apiBase)) {
        return originalFetch(url, options);
      }
    }

    // -------------------------
    // 🚀 GẮN BASE URL CHO API
    // -------------------------
    options.baseURL = apiBase;

    // 🚀 GẮN TOKEN
    const token =
      auth.accessToken ||
      (process.client ? localStorage.getItem("accessToken") : null);

    options.headers = {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    try {
      return await originalFetch(url, options);
    } catch (err) {
      const status = err?.status || err?.response?.status;

      if (status !== 401) throw err;

      // -------------------------
      //      REFRESH TOKEN
      // -------------------------
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
          throw new Error("Không có refresh token");
        }

        const refreshRes = await originalFetch("/auth/refresh-token", {
          method: "POST",
          baseURL: apiBase,
          body: { refreshToken: rt },
        });

        const newAT = refreshRes.accessToken || refreshRes.data?.accessToken;
        const newRT = refreshRes.refreshToken || refreshRes.data?.refreshToken;
        const newUser = refreshRes.user || refreshRes.data?.user || auth.user;

        if (!newAT) throw new Error("Không nhận được token mới");

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

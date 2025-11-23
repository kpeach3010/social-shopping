export default defineNuxtPlugin((nuxtApp) => {
  if (globalThis.__fetchInterceptorSet) return;
  globalThis.__fetchInterceptorSet = true;

  const pinia = nuxtApp.$pinia;
  const auth = useAuthStore(pinia);
  const originalFetch = globalThis.$fetch;
  const apiBase = useRuntimeConfig().public.apiBase;

  globalThis.__isRefreshing = false;
  globalThis.__refreshQueue = [];

  globalThis.$fetch = async (url, options = {}) => {
    // Không intercept assets
    if (typeof url === "string" && url.startsWith("/_nuxt/")) {
      return originalFetch(url, options);
    }

    // Gắn baseURL nếu là đường dẫn tương đối
    if (typeof url === "string" && url.startsWith("/")) {
      options.baseURL = apiBase;
    }

    // 🚨 Chỉ gửi Authorization khi token hợp lệ
    const token = auth.accessToken || localStorage.getItem("accessToken");

    if (token && token.startsWith("ey")) {
      options.headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      };
    }

    try {
      return await originalFetch(url, options);
    } catch (err) {
      const status = err?.status || err?.response?.status;

      if (status !== 401) throw err;

      // Đang refresh → xếp hàng đợi
      if (globalThis.__isRefreshing) {
        return new Promise((resolve, reject) => {
          globalThis.__refreshQueue.push({ resolve, reject, url, options });
        });
      }

      globalThis.__isRefreshing = true;

      try {
        const rt = auth.refreshToken || localStorage.getItem("refreshToken");

        if (!rt) throw new Error("Missing refresh token");

        // ✔️ SỬA baseURL cho đúng
        const refreshRes = await originalFetch("/auth/refresh-token", {
          method: "POST",
          baseURL: apiBase,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: rt }),
        });

        const newAT = refreshRes.accessToken;
        const newRT = refreshRes.refreshToken;
        const newUser = refreshRes.user || auth.user;

        if (!newAT) throw new Error("Refresh API missing accessToken");

        auth.setAuth(newUser, newAT, newRT);

        // Retry request cũ
        return await originalFetch(url, {
          ...options,
          baseURL: apiBase,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${newAT}`,
          },
        });
      } finally {
        globalThis.__isRefreshing = false;
        globalThis.__refreshQueue = [];
      }
    }
  };
});

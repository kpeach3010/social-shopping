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
    // 1) Không intercept file Nuxt / assets
    if (typeof url === "string" && url.startsWith("/_nuxt/")) {
      return originalFetch(url, options);
    }

    // 2) Không intercept URL tuyệt đối
    if (
      typeof url === "string" &&
      (url.startsWith("http://") || url.startsWith("https://"))
    ) {
      return originalFetch(url, options);
    }

    // 3) Tự động gắn baseURL cho đường dẫn tương đối
    if (typeof url === "string" && url.startsWith("/")) {
      options.baseURL = apiBase;
    }

    // Gắn access token nếu có
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

      // Đang refresh → xếp hàng
      if (globalThis.__isRefreshing) {
        return new Promise((resolve, reject) => {
          globalThis.__refreshQueue.push({ resolve, reject, url, options });
        });
      }

      globalThis.__isRefreshing = true;

      try {
        // Lấy refresh token
        const rt =
          auth.refreshToken ||
          (process.client ? localStorage.getItem("refreshToken") : null);

        if (!rt) {
          auth.logout();
          navigateTo("/");
          throw new Error("Missing refresh token");
        }

        // Gọi refresh token
        const refreshRes = await originalFetch("/api/auth/refresh-token", {
          method: "POST",
          baseURL: apiBase,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken: rt }),
        });

        const newAT =
          refreshRes.accessToken ||
          refreshRes.data?.accessToken ||
          refreshRes.data?.access_token;

        const newRT =
          refreshRes.refreshToken ||
          refreshRes.data?.refreshToken ||
          refreshRes.data?.refresh_token;

        const newUser =
          refreshRes.user && refreshRes.user.id ? refreshRes.user : auth.user;

        if (!newAT) throw new Error("Refresh API missing accessToken");

        // Cập nhật auth đầy đủ
        auth.setAuth(newUser, newAT, newRT);

        // Gọi lại request gốc
        const retryRes = await originalFetch(url, {
          ...options,
          baseURL: apiBase,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${newAT}`,
          },
        });

        console.log("===== REFRESH RESPONSE RAW =====", refreshRes);

        globalThis.__refreshQueue.forEach(({ resolve }) => resolve(retryRes));
        globalThis.__refreshQueue = [];

        return retryRes;
      } catch (err2) {
        globalThis.__refreshQueue.forEach(({ reject }) => reject(err2));
        globalThis.__refreshQueue = [];

        auth.logout();
        navigateTo("/");
        throw err2;
      } finally {
        globalThis.__isRefreshing = false;
      }
    }
  };
});

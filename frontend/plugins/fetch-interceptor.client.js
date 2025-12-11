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

    // Gắn baseURL
    if (typeof url === "string" && url.startsWith("/")) {
      options.baseURL = apiBase;
    }

    // Chỉ gửi Authorization khi token hợp lệ
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

      // Nếu không phải lỗi 401 thì ném lỗi ra luôn
      if (status !== 401) throw err;

      // Nếu url là API refresh token mà bị 401 thì nghĩa là hết cứu -> Logout
      if (url.includes("/auth/refresh-token")) {
        auth.logout();
        throw err;
      }

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

        // Gọi API Refresh
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

        // Cập nhật Store
        auth.setAuth(newUser, newAT, newRT);

        // --- [FIX 1: Xử lý hàng đợi request cũ] ---
        globalThis.__refreshQueue.forEach(
          ({ resolve, reject, url, options }) => {
            // Cập nhật token mới cho các request đang đợi
            options.headers.Authorization = `Bearer ${newAT}`;
            originalFetch(url, options).then(resolve).catch(reject);
          }
        );
        // ------------------------------------------

        // --- [FIX 2: Ép Socket kết nối lại với token mới] ---
        if (nuxtApp.$socket) {
          // Ngắt kết nối cũ (đang dùng token hết hạn)
          if (nuxtApp.$socket.connected) nuxtApp.$socket.disconnect();
          // Kết nối lại (Socket plugin bên dưới đã được sửa để lấy token mới)
          nuxtApp.$socket.connect();
        }
        // ---------------------------------------------------

        // Retry request hiện tại
        return await originalFetch(url, {
          ...options,
          baseURL: apiBase,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${newAT}`,
          },
        });
      } catch (refreshErr) {
        // Nếu refresh thất bại -> Logout và từ chối tất cả request đang đợi
        auth.logout();
        globalThis.__refreshQueue.forEach(({ reject }) => reject(refreshErr));
        throw refreshErr;
      } finally {
        globalThis.__isRefreshing = false;
        globalThis.__refreshQueue = [];
      }
    }
  };
});

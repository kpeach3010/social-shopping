export default defineNuxtPlugin(async (nuxtApp) => {
  if (globalThis.__fetchInterceptorSet) return;
  globalThis.__fetchInterceptorSet = true;

  const pinia = nuxtApp.$pinia;
  const auth = useAuthStore(pinia);
  const chatStore = useChatStore ? useChatStore(pinia) : null;

  // Load token từ storage khi chạy client
  if (process.client) await auth.loadFromStorage();

  const originalFetch = globalThis.$fetch;
  const apiBase = useRuntimeConfig().public.apiBase;

  globalThis.__isRefreshing = false;
  globalThis.__refreshQueue = [];

  globalThis.$fetch = async (url, options = {}) => {
    // 🚀 LUÔN THÊM BASE URL CHO MỌI REQUEST
    options.baseURL = apiBase;

    // 🚀 LUÔN GẮN TOKEN CHO MỌI REQUEST
    const token =
      auth.accessToken ||
      (process.client ? localStorage.getItem("accessToken") : null);

    options.headers = {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}), // THIẾT YẾU
    };

    try {
      // Gọi API như bình thường
      return await originalFetch(url, options);
    } catch (err) {
      const status = err?.status || err?.response?.status;

      if (status !== 401) {
        throw err;
      }

      // ================== TÁI SỬA TOKEN ==================
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

        // 🔥 Gọi API refresh token
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

        if (!newAT) throw new Error("Không nhận được access token mới");

        auth.setAuth(newUser, newAT, newRT);

        // 🚀 Gửi lại request gốc sau khi refresh token thành công
        const retryRes = await originalFetch(url, {
          ...options,
          baseURL: apiBase,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${newAT}`,
          },
        });

        // Xử lý mọi request đang chờ refresh
        globalThis.__refreshQueue.forEach(({ resolve }) => resolve(retryRes));
        globalThis.__refreshQueue = [];

        return retryRes;
      } catch (e) {
        // Nếu refresh fail → logout toàn bộ
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

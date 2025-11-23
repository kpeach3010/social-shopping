export default defineNuxtPlugin(async (nuxtApp) => {
  // Ngăn không chạy 2 lần (HMR, reload)
  if (globalThis.__fetchInterceptorSet) return;
  globalThis.__fetchInterceptorSet = true;

  const pinia = nuxtApp.$pinia;
  const auth = useAuthStore(pinia);
  const chatStore = useChatStore ? useChatStore(pinia) : null;

  // Load token khi client mount
  if (process.client) await auth.loadFromStorage();

  // Giữ bản gốc của $fetch
  const originalFetch = globalThis.$fetch;

  const apiBase = useRuntimeConfig().public.apiBase;
  console.log("🔥 Fetch Interceptor init — apiBase =", apiBase);

  globalThis.__isRefreshing = false;
  globalThis.__refreshQueue = [];

  // =============================================
  //  OVERRIDE FETCH
  // =============================================
  globalThis.$fetch = async (url, options = {}) => {
    // ----- LUÔN THÊM BASE URL -----
    options.baseURL = apiBase;

    // ----- LUÔN GẮN TOKEN -----
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

      // Nếu không phải lỗi 401 thì trả ra
      if (status !== 401) throw err;

      // ========================
      // ĐANG REFRESH → XẾP HÀNG
      // ========================
      if (globalThis.__isRefreshing) {
        return new Promise((resolve, reject) => {
          globalThis.__refreshQueue.push({ resolve, reject, url, options });
        });
      }

      // =============================================
      //  BẮT ĐẦU REFRESH TOKEN
      // =============================================
      globalThis.__isRefreshing = true;

      try {
        const rt =
          auth.refreshToken ||
          (process.client ? localStorage.getItem("refreshToken") : null);

        if (!rt) {
          auth.logout();
          navigateTo("/");
          throw new Error("Missing refresh token");
        }

        console.log("🔁 Refreshing token…");

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

        const newUser = refreshRes.user || refreshRes.data?.user;

        if (!newAT) throw new Error("Refresh API did not return access token");

        // Cập nhật auth
        auth.setAuth(newUser, newAT, newRT);

        // ========================
        //  RETRY REQUEST GỐC
        // ========================
        const retry = await originalFetch(url, {
          ...options,
          baseURL: apiBase,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${newAT}`,
          },
        });

        // Xử lý hàng đợi request đang chờ
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

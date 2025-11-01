export default defineNuxtPlugin(async (nuxtApp) => {
  // Tránh set nhiều lần khi HMR reload
  if (globalThis.__fetchInterceptorSet) return;
  globalThis.__fetchInterceptorSet = true;

  const pinia = nuxtApp.$pinia;
  const auth = useAuthStore(pinia);
  const chatStore = useChatStore ? useChatStore(pinia) : null;

  if (process.client) await auth.loadFromStorage();

  const originalFetch = globalThis.$fetch;

  // Cờ và hàng đợi refresh
  globalThis.__isRefreshing = false;
  globalThis.__refreshQueue = [];

  globalThis.$fetch = async (url, options = {}) => {
    try {
      const res = await originalFetch(url, options);
      return res;
    } catch (err) {
      const status = err?.status || err?.response?.status;
      console.error("Fetch error caught:", err);
      console.log("Error status:", status, "URL:", url);

      if (status !== 401) throw err;

      // Nếu đang refresh => xếp request vào hàng đợi
      if (globalThis.__isRefreshing) {
        return new Promise((resolve, reject) => {
          globalThis.__refreshQueue.push({ resolve, reject, url, options });
        });
      }

      //  Bắt đầu refresh token
      globalThis.__isRefreshing = true;

      try {
        // Lấy refresh token
        const rt =
          auth.refreshToken ||
          (process.client ? localStorage.getItem("refreshToken") : null);

        if (!rt) {
          console.warn("⚠️ Không tìm thấy refreshToken -> logout");
          auth.logout();
          navigateTo("/");
          throw new Error("No refresh token available");
        }

        const apiBase = useRuntimeConfig().public.apiBase;
        console.log("🔗 Refresh call to:", `${apiBase}/auth/refresh-token`);

        // Gọi API refresh
        const refreshRes = await originalFetch("/auth/refresh-token", {
          method: "POST",
          baseURL: apiBase,
          body: { refreshToken: rt },
        });

        console.log("Refresh response raw:", refreshRes);

        // Lấy token mới
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

        if (!newAT) {
          console.error(
            "Không có access token mới trong refreshRes:",
            refreshRes
          );
          throw new Error("No new access token from refresh");
        }

        // If a logout was requested while the refresh was in-flight, don't re-auth
        if (typeof globalThis !== "undefined" && globalThis.__logoutRequested) {
          console.warn(
            "Refresh completed but user logged out meanwhile - ignoring refreshed tokens."
          );
          // reject queued requests
          globalThis.__refreshQueue.forEach(({ reject }) =>
            reject(new Error("User logged out during refresh"))
          );
          globalThis.__refreshQueue = [];
          throw new Error("Aborted refresh because user logged out");
        }

        // Lưu lại token mới
        console.log("✅ Refreshed successfully! Updating store...");
        auth.setAuth(newUser, newAT, newRT);

        // Proactively fetch small bits of UI data so header shows immediately
        // (unread count, cart count). These may have failed earlier with 401.
        try {
          // fetch unread count
          if (chatStore) {
            const unread = await originalFetch("/messages/unread-count", {
              baseURL: apiBase,
              headers: { Authorization: `Bearer ${newAT}` },
            });
            if (unread && typeof unread.unreadCount !== "undefined") {
              try {
                chatStore.setUnreadCount(unread.unreadCount || 0);
              } catch (err) {
                console.warn(
                  "Could not set chatStore unread after refresh",
                  err
                );
              }
            }
          }
        } catch (e) {
          console.warn("Could not fetch unread-count after refresh", e);
        }

        try {
          // fetch cart items to compute count and notify header
          const cart = await originalFetch("/cart/get-cart-items", {
            baseURL: apiBase,
            headers: { Authorization: `Bearer ${newAT}` },
          });
          if (cart && Array.isArray(cart.items)) {
            const cartCount = cart.items.reduce(
              (s, i) => s + (i.quantity || 0),
              0
            );
            try {
              // persist for other parts that may read localStorage
              if (process.client)
                localStorage.setItem("cartCount", String(cartCount));
              // dispatch event for header
              if (process.client)
                window.dispatchEvent(
                  new CustomEvent("cart-updated", {
                    detail: { count: cartCount },
                  })
                );
            } catch (err) {
              console.warn(
                "Could not persist/dispatch cart count after refresh",
                err
              );
            }
          }
        } catch (e) {
          console.warn("Could not fetch cart items after refresh", e);
        }

        // Retry request gốc
        const retryRes = await originalFetch(url, {
          ...options,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${newAT}`,
          },
        });

        // Resolve tất cả request đang chờ
        globalThis.__refreshQueue.forEach(({ resolve }) => resolve(retryRes));
        globalThis.__refreshQueue = [];

        return retryRes;
      } catch (refreshErr) {
        console.error("Refresh token failed:", refreshErr);

        // Reject toàn bộ hàng đợi
        globalThis.__refreshQueue.forEach(({ reject }) => reject(refreshErr));
        globalThis.__refreshQueue = [];

        auth.logout();
        navigateTo("/");
        throw refreshErr;
      } finally {
        globalThis.__isRefreshing = false;
      }
    }
  };
});

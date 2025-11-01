// stores/auth.js
export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    accessToken: null,
    refreshToken: null,
  }),
  getters: {
    isLoggedIn: (s) => !!s.accessToken,
  },
  actions: {
    setAuth(user, accessToken, refreshToken) {
      // Only overwrite `user` when a concrete (non-null/undefined) value is provided.
      // This prevents wiping the stored user when the refresh endpoint returns
      // no user object.
      if (typeof user !== "undefined" && user !== null) {
        this.user = user;
      }

      this.accessToken = accessToken || null;

      // refreshToken có thể không đổi; chỉ cập nhật khi có
      if (typeof refreshToken === "string") this.refreshToken = refreshToken;

      if (process.client) {
        if (this.accessToken)
          localStorage.setItem("accessToken", this.accessToken);
        else localStorage.removeItem("accessToken");

        if (this.user) localStorage.setItem("user", JSON.stringify(this.user));
        else localStorage.removeItem("user");

        if (this.refreshToken)
          localStorage.setItem("refreshToken", this.refreshToken);
        else localStorage.removeItem("refreshToken");
      }

      // clear any logout-request flag when we explicitly set auth
      if (typeof globalThis !== "undefined")
        globalThis.__logoutRequested = false;

      // DEBUG: log auth set for tracing
      if (process.client) {
        try {
          console.log("[auth.store] setAuth called", {
            user: this.user,
            accessToken: this.accessToken
              ? this.accessToken.slice(0, 10) + "..."
              : null,
            hasRefresh: !!this.refreshToken,
          });
        } catch (e) {
          /* ignore */
        }
      }

      // notify other UI parts that auth changed (login or refresh)
      if (process.client) {
        try {
          window.dispatchEvent(new Event("auth-changed"));
        } catch (e) {
          console.warn("Could not dispatch auth-changed event", e);
        }
      }
    },
    logout() {
      this.user = null;
      this.accessToken = null;
      this.refreshToken = null;
      this.$patch({});
      if (process.client) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        localStorage.removeItem("checkoutItems");
        localStorage.removeItem("checkoutCoupon");
        localStorage.removeItem("checkoutFromCart");
        window.dispatchEvent(new Event("auth-changed"));
      }
      try {
        const chatStore = useChatStore();
        chatStore.reset();
      } catch (err) {
        console.warn("⚠️ Không thể reset chatStore (chưa được khởi tạo):", err);
      }

      // mark that a logout was requested so background refreshes won't re-auth
      if (typeof globalThis !== "undefined") {
        globalThis.__logoutRequested = true;
        // clear any pending refresh queue
        if (Array.isArray(globalThis.__refreshQueue)) {
          globalThis.__refreshQueue.forEach(({ reject }) =>
            reject(new Error("Logged out"))
          );
          globalThis.__refreshQueue = [];
        }
        globalThis.__isRefreshing = false;
      }

      // Phát sự kiện để các component (header, layout, chat...) tự re-render
      if (process.client) {
        window.dispatchEvent(new Event("auth-changed"));
      }
    },
    async loadFromStorage() {
      if (!process.client) return;
      const at = localStorage.getItem("accessToken");
      const rt = localStorage.getItem("refreshToken");
      const us = localStorage.getItem("user");
      this.accessToken = at || null;
      this.refreshToken = rt || null;
      this.user = us ? JSON.parse(us) : null;
    },
  },
});

import { useAuthStore } from "@/stores/auth";

export function useGroupInvite() {
  const config = useRuntimeConfig();
  const auth = useAuthStore();

  const joinGroupByLink = async (token) => {
    if (!auth.accessToken) {
      alert("Bạn cần đăng nhập để tham gia nhóm");
      return null;
    }

    try {
      const res = await $fetch(`/conversations/join/${token}`, {
        method: "POST",
        baseURL: config.public.apiBase,
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });

      return res;
    } catch (e) {
      console.error("Lỗi tham gia nhóm:", e);
      alert(e?.data?.error || e.message || "Không thể tham gia nhóm");
      return null;
    }
  };

  return { joinGroupByLink };
}

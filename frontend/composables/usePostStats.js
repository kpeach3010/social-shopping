import { reactive, watch, computed, unref } from "vue";
import { $fetch } from "ofetch";

// Quản lý thống kê like/comment; đổi token sẽ tự refetch.
export function usePostStats(postsRef, apiBase, tokenSource) {
  const postStats = reactive({});

  const token = computed(() => {
    const raw =
      typeof tokenSource === "function" ? tokenSource() : unref(tokenSource);
    return raw || "";
  });

  const headers = () =>
    token.value ? { Authorization: `Bearer ${token.value}` } : undefined;

  const firstNumber = (candidates) => {
    for (const v of candidates) if (v !== undefined && v !== null) return v;
    return 0;
  };

  const extractCounts = (raw) => {
    const root = raw || {};
    const post = root.post || {};

    const likes = firstNumber([root.likeCount, post.likeCount]);

    const comments = firstNumber([root.commentCount, post.commentCount]);

    return { likes: Number(likes) || 0, comments: Number(comments) || 0 };
  };

  const fetchStat = async (id) => {
    try {
      const res = await $fetch(`/posts/${id}`, {
        baseURL: apiBase,
        headers: headers(),
      });
      const data = res?.data || res || {};
      postStats[id] = extractCounts(data);
    } catch {
      postStats[id] = { likes: 0, comments: 0 };
    }
  };

  const ensureStats = async () => {
    const list = postsRef?.value || [];
    const ids = list.map((p) => p?.id).filter(Boolean);
    if (!ids.length) return;
    await Promise.all(ids.map((id) => (postStats[id] ? null : fetchStat(id))));
  };

  const refreshStats = async () => {
    Object.keys(postStats).forEach((k) => delete postStats[k]);
    await ensureStats();
  };

  watch(
    () => (postsRef?.value || []).map((p) => p?.id),
    () => ensureStats(),
    { immediate: true }
  );

  watch(
    () => token.value,
    () => refreshStats()
  );

  const bumpLike = (id, delta) => {
    const likes = (postStats[id]?.likes ?? 0) + delta;
    const comments = postStats[id]?.comments ?? 0;
    postStats[id] = {
      likes: Math.max(0, likes),
      comments,
    };
  };

  return { postStats, bumpLike, refreshStats };
}

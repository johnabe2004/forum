/**
 * Resolves a full avatar URL from a relative path or external URL.
 */
export const getAvatarUrl = (avatarPath) => {
  if (!avatarPath) return null;
  if (avatarPath.startsWith("http://") || avatarPath.startsWith("https://")) {
    return avatarPath;
  }
  const apiBase =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:4000/api";
  const backendBase = apiBase.replace(/\/api\/?$/, "");
  return `${backendBase}${avatarPath.startsWith("/") ? "" : "/"}${avatarPath}`;
};

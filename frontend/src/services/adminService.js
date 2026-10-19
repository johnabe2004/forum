import api from "./api.js";

// ============================================================
// ADMIN SERVICE API CALLS
// ============================================================

/**
 * Fetch total statistics for the admin dashboard (users, questions, answers).
 */
export const getDashboardStats = async () => {
  const response = await api.get("/admin/dashboard");
  return response.data;
};

/**
 * Fetch all registered users, with optional search query.
 */
export const getAdminUsers = async (search = "") => {
  const response = await api.get("/admin/users", {
    params: { search: search.trim() || undefined },
  });
  return response.data;
};

/**
 * Remove a user by user_id.
 */
export const deleteAdminUser = async (userId) => {
  const response = await api.delete(`/admin/users/${userId}`);
  return response.data;
};

/**
 * Fetch all questions for moderation, with optional search query.
 */
export const getAdminQuestions = async (search = "") => {
  const response = await api.get("/admin/questions", {
    params: { search: search.trim() || undefined },
  });
  return response.data;
};

/**
 * Delete a question by id or question_hash.
 */
export const deleteAdminQuestion = async (questionId) => {
  const response = await api.delete(`/admin/questions/${questionId}`);
  return response.data;
};

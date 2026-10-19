// ============================================================
// ANSWER API SERVICE
// ============================================================
                   
// FILES
// backend/src/controllers/documentController.js
// backend/src/routes/documentRoutes.js
// backend/src/services/documentService.js
// backend/src/models/Document.js


// Import the configured API client.
import api from "./api.js";
             
// Create a new answer for a specific question
const createAnswer = async ({ questionId, content }) => {
  const response = await api.post("/answers", { questionId, content });
  return response.data.data;
};

// Update an existing answer by its ID
const updateAnswer = async (answerId, content) => {
  const response = await api.put(`/answers/${answerId}`, { content });
  return response.data.data;
};

// Delete an existing answer by its ID
const deleteAnswer = async (answerId) => {
  await api.delete(`/answers/${answerId}`);
};

export { createAnswer, deleteAnswer, updateAnswer };

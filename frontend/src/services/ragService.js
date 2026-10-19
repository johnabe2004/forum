import api from "./api.js";

const listDocuments = async () =>
  (await api.get("/rag/documents")).data.data || [];

const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  // Axios supplies the multipart boundary when given FormData.
  return (await api.post("/rag/documents", formData)).data.data;
};

const searchDocument = async (documentId, query) =>
  (
    await api.get(`/rag/documents/${documentId}/search`, {
      params: { query },
    })
  ).data.data;

const askDocument = async (documentId, query, messageId = null) =>
  (
    await api.post(`/rag/documents/${documentId}/query`, {
      query,
      ...(messageId ? { messageId } : {}),
    })
  ).data.data;

const listChatMessages = async (documentId) =>
  (await api.get(`/rag/documents/${documentId}/messages`)).data.data || [];

const deleteChatMessage = async (documentId, messageId) =>
  (
    await api.delete(
      `/rag/documents/${documentId}/messages/${messageId}`,
    )
  ).data.data;

const clearChatMessages = async (documentId) =>
  (await api.delete(`/rag/documents/${documentId}/messages`)).data.data;

// Summaries read the whole PDF, so allow more time than a normal request.
const summarizeDocument = async (documentId, prompt) =>
  (
    await api.post(
      `/rag/documents/${documentId}/summarize`,
      { prompt },
      { timeout: 120_000 },
    )
  ).data.data;

const deleteDocument = async (documentId) =>
  (await api.delete(`/rag/documents/${documentId}`)).data.data;

const getDocumentFile = async (documentId) => {
  const response = await api.get(`/rag/documents/${documentId}/file`, {
    responseType: "blob",
  });

  return URL.createObjectURL(response.data);
};

export {
  askDocument,
  clearChatMessages,
  deleteDocument,
  deleteChatMessage,
  getDocumentFile,
  listChatMessages,
  listDocuments,
  searchDocument,
  summarizeDocument,
  uploadDocument,
};

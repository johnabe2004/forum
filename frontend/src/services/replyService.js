import api from "./api.js";

const getRepliesByAnswer = async (answerId) => {
  const response = await api.get(`/replies/${answerId}`);
  return response.data.data;
};

const createReply = async ({ answerId, content }) => {
  const response = await api.post("/replies", { answerId, content });
  return response.data.data;
};

export { getRepliesByAnswer, createReply };

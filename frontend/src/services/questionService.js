import api from "./api.js";

// ============================================================
// CREATE QUESTION
// ============================================================

const createQuestion = async ({ title, content }) => {
  const response = await api.post("/questions", { title, content });

  return response.data.data;
};

// ============================================================
// UPDATE QUESTION
// ============================================================

const updateQuestion = async (questionHash, { title, content }) => {
  const response = await api.put(`/questions/${questionHash}`, {
    title,
    content,
  });

  return response.data.data;
};

// ============================================================
// DELETE QUESTION
// ============================================================

const deleteQuestion = async (questionHash) => {
  await api.delete(`/questions/${questionHash}`);
};

// ============================================================
// LIST QUESTIONS
// ============================================================
const listQuestions = async ({ search = "", mine = false } = {}) => {
  const response = await api.get("/questions", {
    params: { search: search || undefined, mine: mine ? "true" : undefined },
  });

  return { questions: response.data.data || [], meta: response.data.meta };
};

// ============================================================
// GET ONE QUESTION
// ============================================================

const getQuestion = async (questionHash) => {
  const response = await api.get(`/questions/${questionHash}`);

  return {
    question: response.data.question,
    answers: response.data.answers || [],
    answersMeta: response.data.answersMeta,
  };
};

// ============================================================
// SEARCH QUESTIONS
// ============================================================
const searchQuestions = async (query) => {
  const response = await api.get("/questions/search", { params: { query } });

  return { results: response.data.data || [], meta: response.data.meta };
};

// ============================================================
// GET SIMILAR QUESTIONS
// ============================================================
const getSimilarQuestions = async (questionHash) => {
  const response = await api.get(`/questions/${questionHash}/similar`);

  return { results: response.data.data || [] };
};

// ============================================================
// AI DRAFT COACH
// ============================================================
const getDraftCoach = async ({ title, content }) => {
  const response = await api.post("/questions/draft-coach", { title, content });

  return response.data.data;
};

// ============================================================
// AI ANSWER FIT
// ============================================================

// Ask the backend to evaluate an answer against a question.
const getAnswerFit = async (questionHash, answerText) => {
  const response = await api.post(
    `/questions/${questionHash}/answer-fit`,
    {
      answerText,
    },
  );

  return response.data.data;
};


// ============================================================
// SAVED QUESTIONS / BOOKMARKS
// ============================================================

// Save one question for the currently authenticated user.
const saveQuestion = async (questionHash) => {
  const response = await api.put(`/bookmarks/${questionHash}`);

  return response.data.data;
};

// Remove one question from the currently authenticated user's saved list.
const removeSavedQuestion = async (questionHash) => {
  const response = await api.delete(`/bookmarks/${questionHash}`);

  return response.data.data;
};

// Read whether the current user has saved a specific question.
const getSavedQuestionStatus = async (questionHash) => {
  const response = await api.get(`/bookmarks/${questionHash}`);

  return response.data.data;
};

// Load all questions saved by the current authenticated user.
const getSavedQuestions = async () => {
  const response = await api.get("/bookmarks");

  return {
    questions: response.data.data || [],
    meta: response.data.meta,
  };
};




// ============================================================
// EXPORT
// ============================================================
export {
  createQuestion,
  deleteQuestion,
  getAnswerFit,
  getDraftCoach,
  getQuestion,
  getSimilarQuestions,
  listQuestions,
  searchQuestions,
  updateQuestion,
  getSavedQuestionStatus,
  getSavedQuestions,
  removeSavedQuestion,
  saveQuestion,
};

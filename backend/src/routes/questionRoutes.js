import express from "express";
import {
  getQuestions,
  getSingleQuestion,
  searchQuestionsSemantic,
  generateQuestionDraftCoach,
  assessAnswerAgainstQuestion,
  getSimilarQuestions,
  updateQuestion,
  deleteQuestion,
} from "../controllers/questionController.js";
import authenticate from "../middleware/authMiddleware.js";
import { draftCoachLimiter } from "../middleware/rateLimiter.js";
const router = express.Router();
// GET /api/questions
router.get("/", authenticate, getQuestions);

// GET /api/questions/search?query=...
router.get("/search", authenticate, searchQuestionsSemantic);

// POST /api/questions/draft-coach   (T-17)
router.post("/draft-coach", authenticate, draftCoachLimiter, generateQuestionDraftCoach);

// GET /api/questions/:questionHash/similar
router.get("/:questionHash/similar", authenticate, getSimilarQuestions);

// GET /api/questions/:questionHash
router.get("/:questionHash", authenticate, getSingleQuestion);

// PUT/DELETE /api/questions/:questionHash
router.put("/:questionHash", authenticate, updateQuestion);
router.delete("/:questionHash", authenticate, deleteQuestion);

// Authentication is required before evaluating an answer.
router.post(
  "/:questionHash/answer-fit",
  authenticate,
  assessAnswerAgainstQuestion,
);

export default router;

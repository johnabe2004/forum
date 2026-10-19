import express from "express";

import {
  getSavedQuestionStatus,
  getSavedQuestions,
  removeSavedQuestion,
  saveQuestion,
} from "../controllers/bookmarkController.js";

import authenticate from "../middleware/authMiddleware.js";

const router = express.Router();

/*
 * Get all questions saved by the current user.
 */
router.get("/", authenticate, getSavedQuestions);

/*
 * Check whether the current user saved one question.
 */
router.get(
  "/:questionHash",
  authenticate,
  getSavedQuestionStatus,
);

/*
 * Save one question.
 *
 * PUT is used because saving is an idempotent operation:
 * repeating the same request does not create duplicates.
 */
router.put(
  "/:questionHash",
  authenticate,
  saveQuestion,
);

/*
 * Remove one saved question.
 */
router.delete(
  "/:questionHash",
  authenticate,
  removeSavedQuestion,
);

export default router;
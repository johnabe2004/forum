import Bookmark from "../models/Bookmark.js";
import { isQuestionHash } from "../utils/questionHash.js";

/*
 * Keep public question identifier validation in one place.
 */
const validateQuestionHash = (questionHash) => {
  if (!isQuestionHash(questionHash)) {
    const error = new Error("Invalid question identifier.");
    error.statusCode = 400;
    throw error;
  }
};

/*
 * Save a question for the current user.
 */
const saveQuestionService = async ({ userId, questionHash }) => {
  validateQuestionHash(questionHash);

  await Bookmark.add({
    userId,
    questionHash,
  });

  return {
    saved: true,
  };
};

/*
 * Remove a question from the current user's saved list.
 */
const removeSavedQuestionService = async ({
  userId,
  questionHash,
}) => {
  validateQuestionHash(questionHash);

  await Bookmark.remove({
    userId,
    questionHash,
  });

  return {
    saved: false,
  };
};

/*
 * Check whether the current user has saved a specific question.
 */
const getSavedQuestionStatusService = async ({
  userId,
  questionHash,
}) => {
  validateQuestionHash(questionHash);

  return {
    saved: await Bookmark.has({
      userId,
      questionHash,
    }),
  };
};

/*
 * Retrieve the current user's complete saved-question list.
 */
const getSavedQuestionsService = async ({ userId }) => {
  return Bookmark.findAllByUserId(userId);
};

export {
  getSavedQuestionStatusService,
  getSavedQuestionsService,
  removeSavedQuestionService,
  saveQuestionService,
};
import {
  getSavedQuestionStatusService,
  getSavedQuestionsService,
  removeSavedQuestionService,
  saveQuestionService,
} from "../services/bookmarkService.js";

/*
 * PUT /api/bookmarks/:questionHash
 *
 * Save a question for the authenticated user.
 */
const saveQuestion = async (req, res, next) => {
  try {
    const data = await saveQuestionService({
      userId: req.user.userId,
      questionHash: req.params.questionHash,
    });

    return res.status(200).json({
      success: true,
      message: "Question saved successfully.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/*
 * DELETE /api/bookmarks/:questionHash
 *
 * Remove a question from the authenticated user's saved list.
 */
const removeSavedQuestion = async (req, res, next) => {
  try {
    const data = await removeSavedQuestionService({
      userId: req.user.userId,
      questionHash: req.params.questionHash,
    });

    return res.status(200).json({
      success: true,
      message: "Question removed from saved questions.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/*
 * GET /api/bookmarks/:questionHash
 *
 * Check the saved status of one question.
 */
const getSavedQuestionStatus = async (req, res, next) => {
  try {
    const data = await getSavedQuestionStatusService({
      userId: req.user.userId,
      questionHash: req.params.questionHash,
    });

    return res.status(200).json({
      success: true,
      message: "Saved-question status fetched successfully.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/*
 * GET /api/bookmarks
 *
 * Return every question saved by the authenticated user.
 */
const getSavedQuestions = async (req, res, next) => {
  try {
    const questions = await getSavedQuestionsService({
      userId: req.user.userId,
    });

    return res.status(200).json({
      success: true,
      message: "Saved questions fetched successfully.",
      data: questions,
      meta: {
        total: questions.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export {
  getSavedQuestionStatus,
  getSavedQuestions,
  removeSavedQuestion,
  saveQuestion,
};
import {
  getQuestionsService,
  searchQuestionsSemanticService,
  getSingleQuestionService,
  getSimilarQuestionsService,
  updateQuestionService,
  deleteQuestionService,
} from "../services/questionService.js";
import { isQuestionHash } from "../utils/questionHash.js";
import env from "../config/env.js";

import {
  generateQuestionDraftCoachService, assessAnswerAgainstQuestionService
} from "../services/aiService.js";

// ============================================================
// SEMANTIC SEARCH VALIDATION
// ============================================================

const parseKParam = (rawK) => {
  if (rawK === undefined) {
    return { value: undefined, error: null };
  }

  const parsed = Number(rawK);

  if (
    !Number.isInteger(parsed) ||
    parsed < 1 ||
    parsed > env.semanticSearch.maxK
  ) {
    return {
      value: null,
      error: `k must be an integer between 1 and ${env.semanticSearch.maxK}.`,
    };
  }

  return { value: parsed, error: null };
};

const parseThresholdParam = (rawThreshold) => {
  if (rawThreshold === undefined) {
    return { value: undefined, error: null };
  }

  const parsed = Number(rawThreshold);

  if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) {
    return {
      value: null,
      error: "threshold must be a number between 0 and 1.",
    };
  }

  return { value: parsed, error: null };
};

// ============================================================
// GET QUESTIONS CONTROLLER (T-10)
// ============================================================

const getQuestions = async (req, res, next) => {
  try {
    const { search, mine } = req.query;
    const onlyMine = mine === "true" || mine === "1";

    const { questions, meta } = await getQuestionsService({
      search: typeof search === "string" ? search.trim() : "",
      onlyMine,
      userId: req.user?.userId,
    });

    return res.status(200).json({
      success: true,
      message: "Questions fetched successfully.",
      data: questions,
      meta,
    });
  } catch (error) {
    next(error);
  }
};


// ============================================================
// SINGLE QUESTION DETAILS CONTROLLER 
// ============================================================
const getSingleQuestion = async (req, res, next) => {
  try {
    // Accept the question public identifier
    const { questionHash } = req.params;

    //  Handle invalid identifiers
    if (!isQuestionHash(questionHash)) {
      return res.status(400).json({
        success: false,
        message: "Invalid question identifier.",
      });
    }

    //  Retrieve requested question and related answers together
    const { question, answers, answersMeta } = await getSingleQuestionService(questionHash);

    // TASK REQUIREMENT: Return question and discussion information
    return res.status(200).json({
      success: true,
      message: "Question fetched successfully",
      question,
      answers,
      answersMeta,
    });
  } catch (error) {
    // Handle database errors
    next(error);
  }
};

const validateQuestionInput = ({ title, content }) => {
  if (typeof title !== "string" || title.trim().length < 5) {
    return "Question title must contain at least 5 characters.";
  }

  if (title.trim().length > 255) {
    return "Question title cannot exceed 255 characters.";
  }

  if (typeof content !== "string" || content.trim().length < 10) {
    return "Question description must contain at least 10 characters.";
  }

  return null;
};

const updateQuestion = async (req, res, next) => {
  try {
    const { questionHash } = req.params;

    if (!isQuestionHash(questionHash)) {
      return res.status(400).json({
        success: false,
        message: "Invalid question identifier.",
      });
    }

    const validationError = validateQuestionInput(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const question = await updateQuestionService({
      questionHash,
      userId: req.user.userId,
      title: req.body.title.trim(),
      content: req.body.content.trim(),
    });

    return res.status(200).json({
      success: true,
      message: "Question updated successfully.",
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

const deleteQuestion = async (req, res, next) => {
  try {
    const { questionHash } = req.params;

    if (!isQuestionHash(questionHash)) {
      return res.status(400).json({
        success: false,
        message: "Invalid question identifier.",
      });
    }

    await deleteQuestionService({
      questionHash,
      userId: req.user.userId,
    });

    return res.status(200).json({
      success: true,
      message: "Question deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};


// ============================================================
// SEMANTIC SEARCH CONTROLLER
// ============================================================

const searchQuestionsSemantic = async (req, res, next) => {
  try {
    const { query, k: rawK, threshold: rawThreshold } = req.query;

    if (typeof query !== "string" || query.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "query must be at least 3 characters.",
      });
    }

    const { value: k, error: kError } = parseKParam(rawK);

    if (kError) {
      return res.status(400).json({ success: false, message: kError });
    }

    const { value: threshold, error: thresholdError } =
      parseThresholdParam(rawThreshold);

    if (thresholdError) {
      return res.status(400).json({ success: false, message: thresholdError });
    }

    const result = await searchQuestionsSemanticService({
      query: query.trim(),
      k,
      threshold,
    });

    return res.status(200).json({
      success: true,
      message: "Semantic search completed successfully",
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};








// ============================================================
// ANSWER FIT CONTROLLER
// ============================================================

// Handles:
// POST /api/questions/:questionHash/answer-fit
//
// Evaluates whether a proposed answer fits the selected question.
const assessAnswerAgainstQuestion = async (req, res, next) => {
  try {
    // Read the question identifier from the URL.
    const { questionHash } = req.params;

    // Read the proposed answer from the request body.
    const { answerText } = req.body;

    // Validate the question identifier.
    if (!isQuestionHash(questionHash)) {
      return res.status(400).json({
        success: false,
        message: "Invalid question identifier.",
      });
    }
    // Validate that an answer was provided.
    if (typeof answerText !== "string" || answerText.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: "answerText must contain at least 20 characters.",
      });
    }

    // This also throws a 404 error when the question does not exist.
    const { question } = await getSingleQuestionService(questionHash);

    // Evaluate the proposed answer against the question context.
    const data = await assessAnswerAgainstQuestionService({
      question,
      answerText: answerText.trim(),
    });

    // Return the AI-generated evaluation.
    return res.status(200).json({
      success: true,
      message: "Answer fit assessed",
      data,
    });
  } catch (error) {
    // Handles question-not-found and Gemini/provider errors.
    next(error);
  }
};

//Similar Questions Controller

const getSimilarQuestions = async (req, res, next) => {
  try {
    // Get the question identifier from the URL.
    const { questionHash } = req.params;

    // Validate the question hash before continuing.
    if (!isQuestionHash(questionHash)) {
      return res.status(400).json({
        success: false,
        message: "Invalid question identifier.",
      });
    }

    // Read optional semantic-search parameters.
    const { k: rawK, threshold: rawThreshold } = req.query;

    // Validate k.
    const { value: k, error: kError } = parseKParam(rawK);

    if (kError) {
      return res.status(400).json({ success: false, message: kError });
    }

    // Validate threshold.
    const { value: threshold, error: thresholdError } =
      parseThresholdParam(rawThreshold);

    if (thresholdError) {
      return res.status(400).json({ success: false, message: thresholdError });
    }

    // Ask the service to find semantically similar questions.
    const result = await getSimilarQuestionsService({
      questionHash,
      k,
      threshold,
    });

    // Return the similar-question results.
    return res.status(200).json({
      success: true,
      message: "Similar questions fetched successfully",
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

//! ---------------NEED TO BE CHECKED-------------

// const assessAnswerAgainstQuestion = async (req, res) => {
//     return res.status(501).json({
//         success: false,
//         message: "Answer fitness evaluation is not implemented yet.",
//     });
// };




// DRAFT COACH CONTROLLER

const generateQuestionDraftCoach = async (req, res, next) => {
  try {
    // Get title and content from the request body.
    const { title, content } = req.body;

    // Make sure title is actually a string.
    const normalizedTitle = typeof title === "string" ? title.trim() : "";
    const normalizedContent = typeof content === "string" ? content.trim() : "";

    if (!normalizedTitle && !normalizedContent) {
      return res.status(400).json({
        success: false,
        message: "Write a title or some details before requesting suggestions.",
      });
    }

    if (normalizedTitle.length > 200) {
      return res.status(400).json({
        success: false,
        message: "Title must not exceed 200 characters.",
      });
    }

    if (normalizedContent.length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Question content must not exceed 5000 characters.",
      });
    }

    const data = await generateQuestionDraftCoachService({
      title: normalizedTitle,
      content: normalizedContent,
    });

    // Return the AI-generated suggestions
    return res.status(200).json({
      success: true,
      message: "Draft suggestions generated",
      data,
    });
  } catch (error) {
    next(error);
  }
};




// ============================================================
// EXPORT CONTROLLERS
// ============================================================

export {
  getQuestions,
  getSingleQuestion,
  getSimilarQuestions,
  updateQuestion,
  deleteQuestion,
  searchQuestionsSemantic,
  generateQuestionDraftCoach,
  assessAnswerAgainstQuestion,
};

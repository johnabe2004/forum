import {
  createReplyService,
  getRepliesByAnswerService,
} from "../services/replyService.js";

const validateCreateReplyInput = ({ answerId, content }) => {
  if (answerId === undefined || answerId === null) {
    return "answerId is required.";
  }

  if (!Number.isInteger(Number(answerId))) {
    return "answerId must be an integer.";
  }

  if (!content || content.trim().length < 2) {
    return "Reply content must contain at least 2 characters.";
  }
  return null;
};

const createReply = async (req, res, next) => {
  try {
    const { answerId, content } = req.body;

    const validationError = validateCreateReplyInput({
      answerId,
      content,
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const reply = await createReplyService({
      answerId: Number(answerId),
      userId: req.user.userId,
      content: content.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Reply posted successfully.",
      data: reply,
    });
  } catch (error) {
    next(error);
  }
};

const getRepliesByAnswer = async (req, res, next) => {
  try {
    const answerId = Number(req.params.answerId);

    if (!Number.isSafeInteger(answerId) || answerId < 1) {
      return res.status(400).json({
        success: false,
        message: "Answer identifier must be a positive integer.",
      });
    }

    const replies = await getRepliesByAnswerService({ answerId });

    return res.status(200).json({
      success: true,
      data: replies,
    });
  } catch (error) {
    next(error);
  }
};

export { createReply, getRepliesByAnswer };

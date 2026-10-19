import { createQuestionService } from "../services/createQuestionService.js";

const createQuestion = async (req, res, next) => {
  try {
    const { title, content } = req.body;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Question title is required.",
      });
    }

    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Question description is required.",
      });
    }

    const userId = req.user.userId;

    const question = await createQuestionService({
      title: title.trim(),
      content: content.trim(),
      userId,
    });

    return res.status(201).json({
      success: true,
      message: "Question created successfully.",
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

export { createQuestion };

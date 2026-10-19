import  Answer  from "../models/Answer.js"; // Adjust import if Answer is a default export in your project
import Reply from "../models/Reply.js";

const createReplyService = async ({ answerId, userId, content }) => {
  // 1. Verify if the parent answer exists
  const answer = await Answer.findById(answerId);

  if (!answer) {
    const error = new Error("Answer not found.");
    error.statusCode = 404;
    throw error;
  }

  // 2. Create the reply and return it with author details
  return await Reply.create({ answerId, userId, content });
};

const getRepliesByAnswerService = async ({ answerId }) => {
  // 1. Verify if the parent answer exists
  const answer = await Answer.findById(answerId);

  if (!answer) {
    const error = new Error("Answer not found.");
    error.statusCode = 404;
    throw error;
  }

  // 2. Fetch and return all replies
  return await Reply.findManyByAnswerId(answerId);
};

export { createReplyService, getRepliesByAnswerService };

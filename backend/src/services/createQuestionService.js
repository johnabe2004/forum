import Question from "../models/Question.js";
import QuestionVector from "../models/QuestionVector.js";
import { embedContent } from "../ai/gemini.js";
import { generateQuestionHash } from "../utils/questionHash.js";

const buildEmbeddingText = ({ title, content }) =>
  `Question title: ${title}\n\nQuestion details: ${content}`.slice(0, 12_000);

const createQuestionService = async ({ title, content, userId }) => {
  const questionHash = generateQuestionHash();

  const question = await Question.create({
    questionHash,
    userId,
    title,
    content,
  });

  // A provider outage must never prevent a member from posting. Store a
  // failed vector so semantic search can backfill it when the provider is up.
  try {
    const result = await embedContent(
      buildEmbeddingText({ title, content }),
      "RETRIEVAL_DOCUMENT",
    );

    await QuestionVector.upsert({
      questionId: question.id,
      embedding: result.success ? result.embedding : null,
      status: result.success ? "ready" : "failed",
    });
  } catch (error) {
    console.warn("Question embedding creation failed:", error.message);
    await QuestionVector.upsert({
      questionId: question.id,
      embedding: null,
      status: "failed",
    });
  }

  return {
    id: question.id,
    questionHash,
    title,
    content,
  };
};

export { createQuestionService };

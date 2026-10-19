import crypto from "crypto";

// Accept legacy 16-char IDs, 32-char IDs, and 64-char IDs
const QUESTION_HASH_PATTERN = /^(?:[a-f0-9]{16}|[a-f0-9]{32}|[a-f0-9]{64})$/i;

const generateQuestionHash = () => {
  return crypto.randomBytes(32).toString("hex"); // Outputs 64 hex characters
};

const isQuestionHash = (value) =>
  typeof value === "string" && QUESTION_HASH_PATTERN.test(value);

export { generateQuestionHash, isQuestionHash };
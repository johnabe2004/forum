
import { generateContent } from "../ai/gemini.js";

// ------------------------------------------------------------
// PARSE JSON FROM AI RESPONSE
// ------------------------------------------------------------
const parseJsonResponse = (rawText) => {
  const cleaned = rawText
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (parseError) {
    console.error(
      "Failed to parse AI JSON response:",
      parseError.message,
      rawText,
    );

    const error = new Error("The AI service returned an unexpected response.");
    error.statusCode = 502;
    throw error;
  }
};


// DRAFT COACH
 const generateQuestionDraftCoachService = async ({
  title,
  content,
}) => {
  const prompt = `
You are a helpful coach for a technical Q&A forum, similar to
Stack Overflow. A user is drafting a question. Give short,
specific, actionable tips that would help other developers
answer it well.

Question title (may be empty): "${title || ""}"
Question content draft:
"""
${content}
"""

Respond with STRICT JSON ONLY, no markdown, no commentary,
matching exactly this shape:

{
  "tips": ["short actionable tip", "short actionable tip"]
}

Rules:
- Return 2 to 4 tips.
- Each tip must be one short sentence.
- Focus on clarity, missing context, code snippets, error
  messages, and expected vs actual behavior.
- If the draft is already excellent, return a single
  encouraging tip instead of inventing filler feedback.

`.trim();

 const rawText = await generateContent(prompt);
  const parsed = parseJsonResponse(rawText);

  const tips = Array.isArray(parsed.tips) ? parsed.tips : [];

  return { tips };
   
};


// ============================================================
// ANSWER FIT
// ============================================================
const assessAnswerAgainstQuestionService = async ({ question, answerText }) => {
  const prompt = `
    You are reviewing a draft answer on a technical Q&A forum before
    it gets submitted. Judge how well the draft answer addresses the
    question below.

    Question title: "${question.title}"
    Question content:
    """
    ${question.content}
    """

    Draft answer:
    """
    ${answerText}
    """

    Respond with STRICT JSON ONLY, no markdown, no commentary,
    matching exactly this shape:

    {
      "level": "strong" | "partial" | "weak",
      "note": "one or two sentence explanation for the author"
    }

    Rules:
    - "strong" means the answer directly and substantively solves
      the question.
    - "partial" means the answer is relevant but incomplete, vague,
      or missing an important detail.
    - "weak" means the answer barely relates to the question or is
      too shallow to help.
    - The note should be constructive and specific.
    `.trim();

  const rawText = await generateContent(prompt);

  const parsed = parseJsonResponse(rawText);

  const allowedLevels = ["strong", "partial", "weak"];
  const level = allowedLevels.includes(parsed.level) ? parsed.level : "partial";

  const note =
    typeof parsed.note === "string" && parsed.note.trim().length > 0
      ? parsed.note
      : "The AI could not generate detailed feedback for this answer.";

  return { level, note };
};

// ============================================================
// EXPORT
// ============================================================

export {
 generateQuestionDraftCoachService,
 assessAnswerAgainstQuestionService,
};
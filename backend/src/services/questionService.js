import Question from "../models/Question.js";
import QuestionVector from "../models/QuestionVector.js";
import Answer from "../models/Answer.js";

import { generateHash } from "../utils/hash.js";
import { embedContent } from "../ai/gemini.js";
import { cosineSimilarity } from "../ai/vectorMath.js";

import env from "../config/env.js";

const buildEmbeddingText = ({ title, content }) =>
    `Question title: ${title}\n\nQuestion details: ${content}`.slice(0, 12000);

// Vector similarity alone can overvalue generic technical phrasing such as
// "How do I...". For recommendations, retain a shared, specific title term
// unless the semantic match is exceptionally strong.
const RELATED_TOPIC_STOP_WORDS = new Set([
    "about", "after", "also", "and", "are", "can", "code", "does", "for",
    "from", "have", "help", "how", "into", "issue", "its", "need", "not",
    "problem", "question", "that", "the", "their", "this", "use", "using",
    "what", "when", "where", "which", "with", "would", "you", "your",
]);

const getTopicTerms = (title = "") =>
    new Set(
        title
            .toLowerCase()
            .match(/[a-z0-9]+/g)
            ?.filter(
                (term) => term.length >= 3 && !RELATED_TOPIC_STOP_WORDS.has(term),
            ) || [],
    );

const hasSharedTopicTerm = (sourceQuestion, candidateQuestion) => {
    const sourceTerms = getTopicTerms(sourceQuestion.title);
    const candidateTerms = getTopicTerms(candidateQuestion.title);

    return [...sourceTerms].some((term) => candidateTerms.has(term));
};

// ============================================================
// CREATE QUESTION & AUTO-EMBED
// ============================================================
const createQuestionWithVectorService = async ({ userId, title, content }) => {

    let questionHash = generateHash();
    let existing = await Question.findByHash(questionHash);

    while (existing) {
        questionHash = generateHash();
        existing = await Question.findByHash(questionHash);
    }

    const created = await Question.create({
        questionHash,
        userId,
        title,
        content,
    });

    const { success, embedding } = await embedContent(
        buildEmbeddingText({ title, content }),
        "RETRIEVAL_DOCUMENT",
    );

    await QuestionVector.upsert({
        questionId: created.id,
        embedding: success ? embedding : null,
        status: success ? "ready" : "failed",
    });

    return {
        id: created.id,
        questionHash: created.questionHash,
        title: created.title,
        content: created.content,
        userId: created.userId,
    };
};

// ============================================================
// GET QUESTIONS SERVICE (T-10)
// ============================================================

const getQuestionsService = async ({ search, onlyMine, userId }) => {
    const questions = await Question.findMany({
        search: search || null,
        userId: onlyMine ? userId : null,
    });

    return {
        questions,
        meta: {
            limit: 100,
            total: questions.length,
            sortBy: "newest",
            sortOrder: "desc",
        },
    };
};


// ============================================================
// SINGLE QUESTION DETAILS SERVICE 
// ============================================================
const getSingleQuestionService = async (questionHash) => {
    // Retrieve the requested question by public hash
    const question = await Question.findByHash(questionHash);

    //Handle question-not-found cases safely
    if (!question) {
        const error = new Error("Question not found.");
        error.statusCode = 404;
        throw error;
    }

    // Retrieve related answers using the internal question ID
    const answers = await Answer.findManyByQuestionId(question.id);

    // TASK REQUIREMENT: Return question and discussion information
    return {
        question,
        answers,
        answersMeta: {
            limit: 100,
            total: answers.length,
        },
    };
};

const updateQuestionService = async ({
    questionHash,
    userId,
    title,
    content,
}) => {
    const question = await Question.findByHash(questionHash);

    if (!question) {
        const error = new Error("Question not found.");
        error.statusCode = 404;
        throw error;
    }

    if (Number(question.author.id) !== Number(userId)) {
        const error = new Error("You can only edit your own question.");
        error.statusCode = 403;
        throw error;
    }

    const updatedQuestion = await Question.updateOwnedByHash(questionHash, userId, {
        title,
        content,
    });

    try {
        const embeddingResult = await embedContent(
            buildEmbeddingText({ title, content }),
            "RETRIEVAL_DOCUMENT",
        );

        await QuestionVector.upsert({
            questionId: updatedQuestion.id,
            embedding: embeddingResult.success ? embeddingResult.embedding : null,
            status: embeddingResult.success ? "ready" : "failed",
        });
    } catch (embeddingError) {
        console.warn("Question embedding refresh failed:", embeddingError.message);
    }

    return updatedQuestion;
};

const deleteQuestionService = async ({ questionHash, userId }) => {
    const question = await Question.findByHash(questionHash);

    if (!question) {
        const error = new Error("Question not found.");
        error.statusCode = 404;
        throw error;
    }

    if (Number(question.author.id) !== Number(userId)) {
        const error = new Error("You can only delete your own question.");
        error.statusCode = 403;
        throw error;
    }

    await Question.deleteOwnedByHash(questionHash, userId);
};

const rankVectorsAgainstQuery = (queryVector, vectors, { k }) => {
    return vectors
        .map((entry) => ({
            ...entry,
            score: cosineSimilarity(queryVector, entry.embedding),
        }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, k);
};

const backfillQuestionEmbeddings = async ({ limit = 10 } = {}) => {
    const pendingQuestions = await QuestionVector.findQuestionsNeedingEmbedding(limit);
    let embedded = 0;

    for (const question of pendingQuestions) {
        const result = await embedContent(
            buildEmbeddingText(question),
            "RETRIEVAL_DOCUMENT",
        );

        await QuestionVector.upsert({
            questionId: question.id,
            embedding: result.success ? result.embedding : null,
            status: result.success ? "ready" : "failed",
        });

        if (result.success) {
            embedded += 1;
        }
    }

    return { attempted: pendingQuestions.length, embedded };
};

const searchQuestionsSemanticService = async ({ query, k, threshold }) => {
    const resolvedK = k || env.semanticSearch.defaultK;
    const resolvedThreshold =
        threshold === undefined || threshold === null
            ? env.semanticSearch.recommendThreshold
            : threshold;

    const { success, embedding: queryVector } = await embedContent(
        query,
        "RETRIEVAL_QUERY",
    );

    if (!success) {
        const error = new Error(
            "The AI search service is temporarily unavailable. Please try again.",
        );
        error.statusCode = 503;
        error.expose = true;
        throw error;
    }

    await backfillQuestionEmbeddings({ limit: env.semanticSearch.backfillLimit });
    const vectors = await QuestionVector.findAllReady();

    const ranked = rankVectorsAgainstQuery(queryVector, vectors, {
        k: resolvedK,
    });

    const questionIds = ranked.map((entry) => entry.questionId);
    const questions = questionIds.length
        ? await Question.findManyByIds(questionIds)
        : [];

    const scoreByQuestionId = new Map(
        ranked.map((entry) => [entry.questionId, entry.score]),
    );

    const data = questions
        .map((question) => ({
            ...question,
            score: scoreByQuestionId.get(question.id) ?? 0,
        }))
        .filter((question) => question.score >= resolvedThreshold);

    return {
        data,
        meta: {
            total: data.length,
            k: resolvedK,
            threshold: resolvedThreshold,
            query,
            questionHash: null,
        },
    };
};

// ============================================================
// FIND SIMILAR QUESTIONS
// ============================================================

const getSimilarQuestionsService = async ({ questionHash, k, threshold }) => {
    const resolvedK = k || env.semanticSearch.defaultK;
    // A caller may request a stricter cutoff, but not a weaker one for the
    // related-questions sidebar.
    const resolvedThreshold = Math.max(
        env.semanticSearch.relatedQuestionThreshold,
        threshold ?? 0,
    );
    const exceptionallyStrongScore = Math.min(resolvedThreshold + 0.12, 0.9);

    const sourceQuestion = await Question.findByHash(questionHash);

    if (!sourceQuestion) {
        const error = new Error("Question not found.");
        error.statusCode = 404;
        throw error;
    }

    const sourceVector = await QuestionVector.findByQuestionId(sourceQuestion.id);

    if (!sourceVector || sourceVector.status !== "ready") {
        // The source question has no usable embedding (embedding
        // failed when it was created). There is nothing to compare
        // against, so we return an empty result instead of an error -
        // the page should simply show "no similar questions found".
        return {
            data: [],
            meta: {
                total: 0,
                k: resolvedK,
                threshold: resolvedThreshold,
                query: null,
                questionHash,
            },
        };
    }

    const vectors = await QuestionVector.findAllReady({
        excludeQuestionId: sourceQuestion.id,
    });

    const ranked = rankVectorsAgainstQuery(sourceVector.embedding, vectors, {
        // Rank the complete local vector set before applying the precision
        // filter, so a valid related question is not hidden by generic ones.
        k: vectors.length,
    });

    const questions = await Question.findManyByIds(
        ranked.map((entry) => entry.questionId),
    );

    const scoreByQuestionId = new Map(
        ranked.map((entry) => [entry.questionId, entry.score]),
    );

    const data = questions
        .map((question) => ({
            ...question,
            score: scoreByQuestionId.get(question.id) ?? 0,
        }))
        .filter(
            (question) =>
                question.score >= resolvedThreshold &&
                (hasSharedTopicTerm(sourceQuestion, question) ||
                    question.score >= exceptionallyStrongScore),
        )
        .slice(0, resolvedK);

    return {
        data,
        meta: {
            total: data.length,
            k: resolvedK,
            threshold: resolvedThreshold,
            query: null,
            questionHash,
        },
    };
};


// ============================================================
// AI DRAFT COACH (T-17)
// ============================================================

const draftCoach = async ({ title, body }) => {
    const prompt = `
You are a writing coach for a technical Q&A forum, similar to Stack Overflow.

A user is DRAFTING a question (not yet posted). Give short, practical
feedback that helps other developers understand and answer it.

Draft title: ${title || "(empty)"}
Draft body: ${body || "(empty)"}

Respond with ONLY valid JSON in this exact shape:
{
    "tips": ["short tip 1", "short tip 2", "short tip 3"],
    "overallQuality": "needs_work" | "good" | "excellent"
}

Rules:
- Give at most 4 tips.
- Each tip must be one short sentence.
- Focus on missing context, vague wording, or missing error details/code.
- If the draft is already clear and detailed, say so honestly instead of
inventing problems.
`;

    const result = await generateJson(prompt);

    return result;
};


const evaluateAnswerFit = async ({ questionHash, answerBody }) => {
    const question = await Question.findByHash(questionHash);

    if (!question) {
        const error = new Error("Question not found.");
        error.statusCode = 404;
        throw error;
    }

    const prompt = `
You are helping evaluate whether a DRAFT answer actually addresses a
question on a technical Q&A forum, before the user posts it.

Question title: ${question.title}
Question body: ${question.content}

Draft answer: ${answerBody}

Respond with ONLY valid JSON in this exact shape:
{
  "fitScore": 0-100,
  "verdict": "off_topic" | "partial" | "strong",
  "feedback": "one short sentence explaining the score"
}

Rules:
- fitScore reflects how directly the draft answer addresses what was
  actually asked, not how well-written it is in general.
- Be honest — a vague or generic answer should score low even if it is
  well-written.
`;

    const result = await generateJson(prompt);

    return result;
};

export {
    backfillQuestionEmbeddings,
    createQuestionWithVectorService,
    deleteQuestionService,
    getQuestionsService,
    getSingleQuestionService,
    searchQuestionsSemanticService,
    getSimilarQuestionsService,
    draftCoach,
    evaluateAnswerFit,
    updateQuestionService,
};

import env from "../config/env.js";
const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

const REQUEST_TIMEOUT_MS = 30_000;
const GENERATION_ATTEMPTS_PER_MODEL = 3;
const EMBEDDING_ATTEMPTS = 2;

// A 429 that says to retry in minutes or hours is a spent quota (for example
// the free tier's daily cap). Retrying immediately only burns more requests.
const isQuotaExhausted = (status, body) => {
  if (status !== 429) return false;

  const delaySeconds = Number(
    String(body || "").match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/)?.[1],
  );

  return (
    /PerDay|RESOURCE_EXHAUSTED/i.test(String(body || "")) &&
    (!Number.isFinite(delaySeconds) || delaySeconds > 60)
  );
};

// Wait without blocking Node's event loop between transient retry attempts.
const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const retryDelay = (attempt, response) => {
  const retryAfter = Number(response?.headers?.get("retry-after"));

  if (Number.isFinite(retryAfter) && retryAfter >= 0) {
    return retryAfter * 1_000;
  }

  return Math.min(1_000 * 2 ** attempt, 8_000);
};

// Do not log an API key, but do provide enough context to debug a failure.
const summarizeFailure = ({ model, operation, status, body, error }) => {
  const detail = error?.message || body || "No provider response body.";
  console.error(
    `Gemini ${operation} failed for ${model}${status ? ` (HTTP ${status})` : ""}:`,
    detail.slice(0, 500),
  );
};

// Require a key before attempting a remote request.
const assertApiKeyConfigured = () => {
  if (!env.geminiApiKey) {
    const error = new Error("AI features are not configured on the server.");
    error.statusCode = 503;
    error.expose = true;
    throw error;
  }
};

const serviceUnavailableError = (message) => {
  const error = new Error(message);
  error.statusCode = 503;
  error.expose = true;
  return error;
};

const requestGemini = async ({
  model,
  operation,
  endpoint,
  payload,
  attempts,
  timeoutMs = REQUEST_TIMEOUT_MS,
}) => {
  assertApiKeyConfigured();

  const url = `${GEMINI_BASE_URL}/${model}:${endpoint}?key=${env.geminiApiKey}`;
  let lastFailure = null;
  // If all attempts fail, this variable will contain information
  // about the final failure.

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const body = await response.text();

      if (response.ok) {
        return { ok: true, body };
      }

      lastFailure = { status: response.status, body };
      // Invalid credentials/request shapes cannot be fixed by retrying.
      if (!RETRYABLE_STATUS_CODES.has(response.status)) {
        break;
      }
      // Do not retry a spent quota; let the caller try the fallback model.
      if (isQuotaExhausted(response.status, body)) {
        break;
      }
      if (attempt < attempts - 1) {
        await wait(retryDelay(attempt, response));
      }
    } catch (error) {
      lastFailure = { error };
      if (attempt < attempts - 1) {
        await wait(retryDelay(attempt));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  summarizeFailure({ model, operation, ...lastFailure });
  return { ok: false, ...lastFailure };
};
// Parse only valid JSON responses from Gemini.
const parseJson = (body, model, operation) => {
  try {
    return JSON.parse(body);
  } catch {
    console.error(`Gemini ${operation} returned invalid JSON for ${model}.`);
    return null;
  }
};

async function embedContent(text, taskType = "RETRIEVAL_DOCUMENT") {
  if (!env.geminiApiKey || !env.geminiEmbeddingModel) {
    return {
      success: false,
      embedding: null,
      error: serviceUnavailableError(
        "AI search is not configured on the server.",
      ),
    };
  }

  const response = await requestGemini({
    model: env.geminiEmbeddingModel,
    operation: "embedContent",
    endpoint: "embedContent",
    attempts: EMBEDDING_ATTEMPTS,
    payload: {
      model: `models/${env.geminiEmbeddingModel}`,
      content: { parts: [{ text }] },
      taskType: taskType,
    },
  });

  if (!response.ok) {
    return {
      success: false,
      embedding: null,
      error: serviceUnavailableError(
        "AI search is temporarily unavailable. Please try again shortly.",
      ),
    };
  }

  const data = parseJson(
    response.body,
    env.geminiEmbeddingModel,
    "embedContent",
  );
  const embedding = data?.embedding?.values;

  if (!Array.isArray(embedding) || embedding.length === 0) {
    return {
      success: false,
      embedding: null,
      error: serviceUnavailableError(
        "AI search returned an unusable embedding. Please try again shortly.",
      ),
    };
  }

  return { success: true, embedding };
}

// Return the configured primary model followed by a known stable fallback.
const generationModels = () => {
  const fallbacks = (env.geminiFallbackModel || "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  return [...new Set([env.geminiModel, ...fallbacks].filter(Boolean))];
};

// =============================================================
//                   GENERATE CONTENT
// =============================================================

// Generate text using the configured Gemini model.
// Defaults keep the original behavior (short JSON answers). Callers such as
// document summarization can request longer plain-text output.
const generateContent = async (prompt, options = {}) => {
  const {
    json = true,
    maxOutputTokens = 512,
    temperature = 0.1,
    timeoutMs,
  } = options;

  // Fail early when the API key is missing.
  assertApiKeyConfigured();

  if (!generationModels().length) {
    throw serviceUnavailableError(
      "AI suggestions are not configured on the server.",
    );
  }

  let sawQuotaLimit = false;

  // Try the primary model and configured fallback model.
  for (const model of generationModels()) {
    const response = await requestGemini({
      model,
      operation: "generateContent",
      endpoint: "generateContent",
      attempts: GENERATION_ATTEMPTS_PER_MODEL,
      timeoutMs,

      // Send the evaluation prompt to Gemini.
      payload: {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          ...(json ? { responseMimeType: "application/json" } : {}),
          temperature,
          maxOutputTokens,
        },
      },
    });

    // Try the next model when Gemini returns an error.
    if (!response.ok) {
      if (response.status === 429) sawQuotaLimit = true;
      continue;
    }

    const data = parseJson(response.body, model, "generateContent");

    // Extract generated text from Gemini's response.
    const text = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

    if (text) {
      return text;
    }
    console.error(`Gemini generateContent returned no text for ${model}.`);
  }

  // Tell the user plainly when the AI usage limit is the reason.
  if (sawQuotaLimit) {
    const error = new Error(
      "The AI usage limit has been reached. Please try again later.",
    );
    error.statusCode = 429;
    error.expose = true;
    throw error;
  }

  // Return a service error when all Gemini models fail.
  throw serviceUnavailableError(
    "The AI service is busy right now. Please try again in a moment.",
  );
};

// Long plain-text generation (summaries): no JSON mode and a large output
// budget, because thinking models spend part of it before writing the answer.
const generateLongText = (prompt, options = {}) =>
  generateContent(prompt, {
    json: false,
    maxOutputTokens: 8192,
    temperature: 0.3,
    timeoutMs: 90_000,
    ...options,
  });

export { embedContent, generateContent, generateLongText };
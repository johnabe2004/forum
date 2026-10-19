import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Resolve paths from the backend folder rather than the process working
// directory, which differs between `npm start` and hosting panels such as
// DirectAdmin's Node.js selector (Passenger).
const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

dotenv.config({ path: path.join(backendRoot, ".env") });

const numberFromEnv = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const env = {
  backendRoot,
  port: process.env.PORT || 4000,

  database: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
    // Hosted MySQL services (Aiven, TiDB Cloud, ...) require TLS.
    ssl:
      process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  },
  jwtSecret: process.env.JWT_SECRET,
  // FRONTEND_URL may list several origins separated by commas; the first one
  // is used to build links in emails.
  frontendUrls: (process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map((url) => url.trim().replace(/\/+$/, ""))
    .filter(Boolean),
  get frontendUrl() {
    return this.frontendUrls[0];
  },

  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS,

  geminiApiKey: process.env.GEMINI_API_KEY?.trim(),
  geminiModel: process.env.GEMINI_MODEL?.trim(),
  geminiEmbeddingModel: process.env.GEMINI_EMBEDDING_MODEL?.trim(),
  geminiFallbackModel: process.env.GEMINI_FALLBACK_MODEL?.trim(),

  semanticSearch: {
    defaultK: numberFromEnv(process.env.SEMANTIC_SEARCH_DEFAULT_K, 10),
    recommendThreshold: numberFromEnv(
      process.env.SEMANTIC_SEARCH_RECOMMEND_THRESHOLD ??
        process.env.RECOMMEND_THRESHOLD,
      0.6,
    ),
    // Recommendations need a stricter threshold than an intentional search.
    relatedQuestionThreshold: numberFromEnv(
      process.env.RELATED_QUESTION_THRESHOLD,
      0.72,
    ),
    maxK: numberFromEnv(process.env.SEMANTIC_SEARCH_MAX_K, 20),
    backfillLimit: numberFromEnv(
      process.env.SEMANTIC_SEARCH_BACKFILL_LIMIT,
      10,
    ),
  },
  rag: {
    uploadDir: process.env.RAG_UPLOAD_DIR || "uploads/rag-documents",
    maxFileSizeBytes: numberFromEnv(
      process.env.RAG_MAX_FILE_SIZE_BYTES,
      10 * 1024 * 1024,
    ),
    evidenceThreshold: numberFromEnv(process.env.RAG_EVIDENCE_THRESHOLD, 0.55),
    searchThreshold: numberFromEnv(process.env.RAG_SEARCH_THRESHOLD, 0.6),
  },
};

export default env;

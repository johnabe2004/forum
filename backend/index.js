import express from "express";
import questionRoutes from "./src/routes/questionRoutes.js";
// Importing and initializing the  automatic database initialization for authentication schema
import { initializeDatabase } from "./src/config/initDb.js";
await initializeDatabase();

// for saved questions/bookmarks
import bookmarkRoutes from "./src/routes/bookmarkRoutes.js";


// Import CORS.
import cors from "cors";

// Import our centralized environment configuration.
import createQuestionRoutes from "./src/routes/createQuestionRoutes.js";
import answerRoutes from "./src/routes/answerRoutes.js";
import replyRoutes from "./src/routes/replyRoutes.js";
import documentRoutes from "./src/routes/documentRoutes.js";
import env from "./src/config/env.js";
import authRoutes from "./src/routes/authRoutes.js";
import { notFound, errorHandler } from "./src/middleware/errorMiddleware.js";
import pool from "./src/config/db.js";
import adminRoutes from "./src/routes/adminRoutes.js";


import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// CREATE EXPRESS APPLICATION
// ============================================================

const app = express();
app.use(cors());
app.use(express.json({ limit: "100kb" }));

// Serve uploaded assets (avatars, documents)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AI Powered Evangadi Forum API is running.",
  });
});

app.use("/api/questions", questionRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/questions", createQuestionRoutes);
app.use("/api/answers", answerRoutes);
app.use("/api/replies", replyRoutes);
app.use("/api/rag/documents", documentRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/bookmarks", bookmarkRoutes);
app.use("/api/admin", adminRoutes);
app.use(notFound);
app.use(errorHandler);
const testDatabaseConnection = async () => {
  try {
    const connection = await pool.getConnection();
    connection.release();
    console.log("MySQL database connected successfully.");
  } catch (error) {
    console.error("MySQL database connection failed:", error.message);
  }
};
app.listen(env.port, async () => {
  console.log(`AI Powered Evangadi Forum API is running on port ${env.port}.`);
  await testDatabaseConnection();
});

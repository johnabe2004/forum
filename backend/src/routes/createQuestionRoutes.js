import express from "express";
import authenticate from "../middleware/authMiddleware.js";
import { createQuestion } from "../controllers/createQuestionController.js";

const router = express.Router();

router.post("/", authenticate, createQuestion);

export default router;

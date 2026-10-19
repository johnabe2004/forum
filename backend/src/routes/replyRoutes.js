import express from "express";
import {
  createReply,
  getRepliesByAnswer,
} from "../controllers/replyController.js";
import authenticate from "../middleware/authMiddleware.js";

const router = express.Router();

// 1. Route to post a new reply (Requires authentication)
router.post("/", authenticate, createReply);

// 2. Route to get all replies for a specific answer
router.get("/:answerId", getRepliesByAnswer);

export default router;

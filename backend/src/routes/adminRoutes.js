import express from "express";
import {
  getDashboardStats,
  getAdminUsers,
  deleteAdminUser,
  getAdminQuestions,
  deleteAdminQuestion,
} from "../controllers/adminController.js";
import authenticate from "../middleware/authMiddleware.js";
import adminOnly from "../middleware/adminMiddleware.js";

const router = express.Router();

// Protect ALL admin routes:
// 1. authenticate: checks valid JWT token
// 2. adminOnly: checks database role === 'admin'
router.use(authenticate, adminOnly);

// Dashboard statistics
router.get("/dashboard", getDashboardStats);

// User management
router.get("/users", getAdminUsers);
router.delete("/users/:userId", deleteAdminUser);

// Question moderation
router.get("/questions", getAdminQuestions);
router.delete("/questions/:questionId", deleteAdminQuestion);

export default router;

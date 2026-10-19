import express from "express";
import {
  register,
  login,
  getMe,
  initiatePasswordReset,
  handlePasswordResetConfirm,
  getProfile,
  updateProfile,
  uploadAvatar,
  updateAccount,
  changePassword,
} from "../controllers/authController.js";
import authenticate from "../middleware/authMiddleware.js";
import avatarUpload from "../middleware/avatarUploadMiddleware.js";

const router = express.Router();

router.post("/register", register);

router.post("/login", login);

router.get("/me", authenticate, getMe);

// Profile endpoints
router.get("/profile", authenticate, getProfile);

router.put("/profile", authenticate, updateProfile);

router.post(
  "/avatar",
  authenticate,
  avatarUpload.single("avatar"),
  uploadAvatar,
);

router.post("/forgot-password", initiatePasswordReset);
router.post("/reset-password-confirm", handlePasswordResetConfirm);
// Account & Password settings endpoints
router.put("/account", authenticate, updateAccount);

router.put("/change-password", authenticate, changePassword);

export default router;

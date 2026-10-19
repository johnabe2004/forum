import User from "../models/User.js";
import nodemailer from "nodemailer"; 
import env from "../config/env.js";

import { hashPassword, comparePassword } from "../utils/password.js";


import {
  generateToken,
  generateResetToken,
  verifyToken,
} from "../utils/jwt.js";
import { getPasswordResetHTML } from "../utils/emailTemplates.js";

// ============================================================
// REGISTER USER
// ============================================================

const registerUser = async ({ firstName, lastName, email, password }) => {
  // Check whether an account already exists with this email.

  const existingUser = await User.findByEmail(email);

  if (existingUser) {
    const error = new Error("An account with this email already exists.");

    error.statusCode = 409;

    throw error;
  }

  // Validate password length after checking for an existing
  // account.

  if (password.length < 8) {
    const error = new Error("Password must contain at least 8 characters.");

    error.statusCode = 400;

    throw error;
  }

  // Hash the password before storing it in the database.
  const passwordHash = await hashPassword(password);

  // Create the user account.
  const user = await User.create({
    firstName,
    lastName,
    email,
    passwordHash,
  });

  // Generate a JWT for the newly created user.
  const token = generateToken(user.userId);

  return {
    user,
    token,
  };
};

// ============================================================
// LOGIN USER
// ============================================================

const loginUser = async ({ email, password }) => {
  const user = await User.findByEmail(email);

  if (!user) {
    const error = new Error("Incorrect email or password.");
    error.statusCode = 401;
    throw error;
  }

  if (!user.password_hash) {
   const error = new Error("Incorrect email or password.");
    error.statusCode = 401;
    throw error;
  }

  // Compare the supplied password with the stored password hash.
  const isPasswordValid = await comparePassword(password, user.password_hash);

  if (!isPasswordValid) {
   const error = new Error("Incorrect email or password.");
    error.statusCode = 401;
    throw error;
  }

  // Generate a JWT after successful authentication.
  const token = generateToken(user.user_id);

  return {
    user: {
      userId: user.user_id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role || "user",
      avatarUrl: user.avatar_url || null,
      headline: user.headline || null,
    },
    token,
  };
};

// ============================================================
// GET CURRENT USER
// ============================================================

const getCurrentUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  return {
    userId: user.user_id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    role: user.role || "user",
    avatarUrl: user.avatar_url || null,
    headline: user.headline || null,
  };
};


// ============================================================
// FORGOT PASSWORD
// ============================================================
const forgotPassword = async (email) => {
  // 1. Verify if the user exists in the database
  const user = await User.findByEmail(email);

  if (!user) {
    const error = new Error("No account found with this email address.");
    error.statusCode = 404;
    throw error;
  }

  // 2. Generate a secure, short-lived reset token (15 mins) using your JWT utility
  const resetToken = generateResetToken(user.user_id);

  // 3. Construct the password reset URL for your Vite frontend application
  const resetUrl = `${env.frontendUrl}/reset-password/${resetToken}`;

  // 4. Generate the HTML template (passing only the resetUrl argument)
  const emailHtml = getPasswordResetHTML(resetUrl);

  // 5. Configure Nodemailer Transporter using the simplified Gmail service setting
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: env.emailUser, // Loaded from process.env.EMAIL_USER
      pass: env.emailPass, // Loaded from process.env.EMAIL_PASS (16-character App Password)
    },
  });

  // 6. Transmit the email to the user
  await transporter.sendMail({
    from: `"Evangadi Forum Support" <${env.emailUser}>`,
    to: user.email,
    subject: "Password Reset Request",
    html: emailHtml,
  });

  return { message: "Reset token sent successfully." };
};

// ============================================================
// RESET PASSWORD CONFIRM
// ============================================================
const resetPasswordConfirm = async (token, newPassword) => {
  let decoded;

  // 1. Verify the validity and expiration of the JWT reset token
  try {
    decoded = verifyToken(token);
  } catch (err) {
    const error = new Error("The reset link is invalid or has expired.");
    error.statusCode = 400;
    throw error;
  }

  // 2. Validate the dedicated token purpose flag for strict safety
  if (decoded.purpose !== "password_reset") {
    const error = new Error("Invalid token authorization category.");
    error.statusCode = 400;
    throw error;
  }

  // 3. Extract the userId from the valid token payload
  const userId = decoded.userId; 
  if (!userId) {
    const error = new Error("Invalid token payload configuration.");
    error.statusCode = 400;
    throw error;
  }

  // 4. Enforce the standard 8-character password length rule
  if (newPassword.length < 8) {
    const error = new Error("New password must contain at least 8 characters.");
    error.statusCode = 400;
    throw error;
  }

  // 5. Securely hash the incoming new password
  const newPasswordHash = await hashPassword(newPassword);

  // 6. Update the database record reusing your teammate's model function
  const updateSuccess = await User.updatePassword(userId, newPasswordHash);

  if (!updateSuccess) {
    const error = new Error("Password reset operation failed. Account not found.");
    error.statusCode = 404;
    throw error;
  }

  return { message: "Password updated successfully." };
};


// ============================================================
// GET USER PROFILE (WITH COMPUTED STATS)
// ============================================================

const getUserProfile = async (userId) => {
  const profile = await User.getProfileWithStats(userId);

  if (!profile) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  return {
    userId: profile.user_id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    email: profile.email,
    role: profile.role || "user",
    avatarUrl: profile.avatar_url || null,
    headline: profile.headline || "",
    bio: profile.bio || "",
    location: profile.location || "",
    githubUrl: profile.github_url || "",
    portfolioUrl: profile.portfolio_url || "",
    createdAt: profile.created_at,
    questionsCount: Number(profile.questions_count) || 0,
    answersCount: Number(profile.answers_count) || 0,
  };
};

// ============================================================
// UPDATE USER PROFILE
// ============================================================

const updateUserProfile = async (userId, { headline, bio, location, githubUrl, portfolioUrl }) => {
  const profile = await User.updateProfile(userId, { headline, bio, location, githubUrl, portfolioUrl });

  if (!profile) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  return {
    userId: profile.user_id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    email: profile.email,
    avatarUrl: profile.avatar_url || null,
    headline: profile.headline || "",
    bio: profile.bio || "",
    location: profile.location || "",
    githubUrl: profile.github_url || "",
    portfolioUrl: profile.portfolio_url || "",
    createdAt: profile.created_at,
    questionsCount: Number(profile.questions_count) || 0,
    answersCount: Number(profile.answers_count) || 0,
  };
};

// ============================================================
// UPDATE AVATAR
// ============================================================

const updateUserAvatar = async (userId, avatarUrl) => {
  const profile = await User.updateAvatar(userId, avatarUrl);

  if (!profile) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  return {
    avatarUrl: profile.avatar_url,
  };
};

// ============================================================
// UPDATE ACCOUNT INFORMATION (FIRST NAME, LAST NAME, EMAIL)
// ============================================================

const updateUserAccount = async (userId, { firstName, lastName, email }) => {
  // If email was changed, ensure no other user has it
  const existingUser = await User.findByEmail(email);

  if (existingUser && Number(existingUser.user_id) !== Number(userId)) {
    const error = new Error("An account with this email already exists.");
    error.statusCode = 409;
    throw error;
  }

  const updated = await User.updateAccount(userId, { firstName, lastName, email });

  if (!updated) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  return {
    userId: updated.user_id,
    firstName: updated.first_name,
    lastName: updated.last_name,
    email: updated.email,
    role: updated.role || "user",
    avatarUrl: updated.avatar_url || null,
    headline: updated.headline || null,
  };
};

// ============================================================
// CHANGE PASSWORD
// ============================================================

const changeUserPassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findByIdWithPassword(userId);

  if (!user || !user.password_hash) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  const isPasswordValid = await comparePassword(currentPassword, user.password_hash);

  if (!isPasswordValid) {
    const error = new Error("Current password is incorrect.");
    error.statusCode = 400;
    throw error;
  }

  if (newPassword.length < 8) {
    const error = new Error("New password must contain at least 8 characters.");
    error.statusCode = 400;
    throw error;
  }

  const newPasswordHash = await hashPassword(newPassword);
  await User.updatePassword(userId, newPasswordHash);

  return { message: "Password updated successfully." };
};

export {
  registerUser,
  loginUser,
  getCurrentUser,
  forgotPassword,
  resetPasswordConfirm,
  getUserProfile,
  updateUserProfile,
  updateUserAvatar,
  updateUserAccount,
  changeUserPassword,
};

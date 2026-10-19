import pool from "../config/db.js";

// Middleware to ensure the authenticated user is an administrator
const adminOnly = async (req, res, next) => {
  try {
    // req.user is set by the authenticate middleware
    if (!req.user || !req.user.userId) {
      const error = new Error("Authentication required.");
      error.statusCode = 401;
      return next(error);
    }

    // Fetch the user's current role directly from the database
    const [rows] = await pool.execute(
      "SELECT role FROM users WHERE user_id = ? LIMIT 1",
      [req.user.userId],
    );

    const user = rows[0];

    if (!user || user.role !== "admin") {
      const forbiddenError = new Error(
        "Access denied. Administrator privileges required.",
      );
      forbiddenError.statusCode = 403;
      return next(forbiddenError);
    }

    // Role is valid, proceed to the next handler
    next();
  } catch (error) {
    next(error);
  }
};

export default adminOnly;

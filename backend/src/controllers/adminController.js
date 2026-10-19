import pool from "../config/db.js";

// ============================================================
// 1. DASHBOARD STATISTICS
// ============================================================
export const getDashboardStats = async (req, res, next) => {
  try {
    const [[userResult]] = await pool.query("SELECT COUNT(*) AS count FROM users");
    const [[questionResult]] = await pool.query("SELECT COUNT(*) AS count FROM questions");
    const [[answerResult]] = await pool.query("SELECT COUNT(*) AS count FROM answers");

    res.status(200).json({
      success: true,
      stats: {
        totalUsers: Number(userResult.count) || 0,
        totalQuestions: Number(questionResult.count) || 0,
        totalAnswers: Number(answerResult.count) || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 2. GET USERS LIST (WITH SEARCH)
// ============================================================
export const getAdminUsers = async (req, res, next) => {
  try {
    const search = req.query.search?.trim();

    let query = `
      SELECT
        user_id,
        first_name,
        last_name,
        email,
        role,
        created_at
      FROM users
    `;
    const params = [];

    if (search) {
      query += `
        WHERE first_name LIKE ?
           OR last_name LIKE ?
           OR email LIKE ?
      `;
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern);
    }

    query += " ORDER BY created_at DESC";

    const [users] = await pool.execute(query, params);

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 3. REMOVE USER (SAFE DELETION)
// ============================================================
export const deleteAdminUser = async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const { userId } = req.params;

    // Safety rule: Admin cannot remove themselves
    if (Number(userId) === Number(req.user.userId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot remove your own admin account.",
      });
    }

    // Check if user exists
    const [targetUser] = await connection.execute(
      "SELECT user_id, first_name, last_name FROM users WHERE user_id = ? LIMIT 1",
      [userId],
    );

    if (targetUser.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Start a transaction to ensure all child data is safely cleaned up
    await connection.beginTransaction();

    // 1. Find all questions asked by this user
    const [userQuestions] = await connection.execute(
      "SELECT id FROM questions WHERE user_id = ?",
      [userId],
    );

    // 2. Remove answers that belong to the user's questions
    if (userQuestions.length > 0) {
      const questionIds = userQuestions.map((q) => q.id);
      const placeholders = questionIds.map(() => "?").join(",");
      await connection.query(
        `DELETE FROM answers WHERE question_id IN (${placeholders})`,
        questionIds,
      );
    }

    // 3. Remove answers written by this user
    await connection.execute("DELETE FROM answers WHERE user_id = ?", [userId]);

    // 4. Remove questions asked by this user
    await connection.execute("DELETE FROM questions WHERE user_id = ?", [userId]);

    // 5. Finally remove the user record
    await connection.execute("DELETE FROM users WHERE user_id = ?", [userId]);

    // Commit the entire transaction
    await connection.commit();

    res.status(200).json({
      success: true,
      message: `User ${targetUser[0].first_name} ${targetUser[0].last_name} removed successfully.`,
    });
  } catch (error) {
    // If any error occurred, rollback all changes
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

// ============================================================
// 4. GET QUESTIONS LIST (WITH SEARCH)
// ============================================================
export const getAdminQuestions = async (req, res, next) => {
  try {
    const search = req.query.search?.trim();

    let query = `
      SELECT
        q.id,
        q.question_hash,
        q.title,
        q.content,
        q.created_at,
        u.user_id,
        u.first_name,
        u.last_name,
        u.email
      FROM questions q
      JOIN users u ON q.user_id = u.user_id
    `;
    const params = [];

    if (search) {
      query += `
        WHERE q.title LIKE ?
           OR q.content LIKE ?
           OR u.first_name LIKE ?
           OR u.last_name LIKE ?
           OR u.email LIKE ?
      `;
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern, pattern);
    }

    query += " ORDER BY q.created_at DESC";

    const [questions] = await pool.execute(query, params);

    res.status(200).json({
      success: true,
      questions,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 5. DELETE QUESTION (CONTENT MODERATION)
// ============================================================
export const deleteAdminQuestion = async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const { questionId } = req.params;

    // Look up question by numerical ID or by question_hash
    const [target] = await connection.execute(
      "SELECT id, title FROM questions WHERE id = ? OR question_hash = ? LIMIT 1",
      [questionId, questionId],
    );

    if (target.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Question not found.",
      });
    }

    const internalId = target[0].id;

    await connection.beginTransaction();

    // 1. Delete associated answers first to prevent foreign key errors
    await connection.execute("DELETE FROM answers WHERE question_id = ?", [
      internalId,
    ]);

    // 2. Delete the question (vector embeddings cascade automatically)
    await connection.execute("DELETE FROM questions WHERE id = ?", [
      internalId,
    ]);

    await connection.commit();

    res.status(200).json({
      success: true,
      message: "Question deleted successfully.",
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

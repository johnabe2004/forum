import pool from "../config/db.js";

/*
 * Convert the MySQL row format into the same question object
 * shape already used by QuestionCard and QuestionDetail.
 */
const mapQuestionRow = (row) => ({
  id: row.id,
  questionHash: row.question_hash,
  title: row.title,
  content: row.content,
  answerCount: Number(row.answer_count) || 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,

  author: {
    id: row.author_id,
    firstName: row.author_first_name,
    lastName: row.author_last_name,
  },
});

const Bookmark = {
  /*
   * Save one question for one authenticated user.
   */
  async add({ userId, questionHash }) {
    /*
     * First convert the public questionHash into the internal
     * numeric question ID.
     */
    const [questions] = await pool.execute(
      "SELECT id FROM questions WHERE question_hash = ? LIMIT 1",
      [questionHash],
    );

    /*
     * The URL contained a valid-looking hash, but the question
     * itself may no longer exist.
     */
    if (!questions[0]) {
      const error = new Error("Question not found.");
      error.statusCode = 404;
      throw error;
    }

    /*
     * INSERT creates the bookmark.
     *
     * If the same user already saved the same question,
     * the composite primary key prevents a duplicate.
     *
     * We deliberately keep the original created_at timestamp.
     */
    await pool.execute(
      `INSERT INTO question_bookmarks (user_id, question_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE created_at = question_bookmarks.created_at`,
      [userId, questions[0].id],
    );
  },

  /*
   * Remove one question from one user's saved list.
   */
  async remove({ userId, questionHash }) {
    const [result] = await pool.execute(
      `DELETE b
       FROM question_bookmarks b
       INNER JOIN questions q ON q.id = b.question_id
       WHERE b.user_id = ? AND q.question_hash = ?`,
      [userId, questionHash],
    );

    return result.affectedRows > 0;
  },

  /*
   * Check whether one user has saved one question.
   */
  async has({ userId, questionHash }) {
    const [rows] = await pool.execute(
      `SELECT 1
       FROM question_bookmarks b
       INNER JOIN questions q ON q.id = b.question_id
       WHERE b.user_id = ? AND q.question_hash = ?
       LIMIT 1`,
      [userId, questionHash],
    );

    return Boolean(rows[0]);
  },

  /*
   * Retrieve every question saved by one authenticated user.
   *
   * We return the same question structure used by QuestionCard,
   * so the existing QuestionCard component can be reused.
   */
  async findAllByUserId(userId) {
    const [rows] = await pool.execute(
      `SELECT
         q.id,
         q.question_hash,
         q.title,
         q.content,
         q.created_at,
         q.updated_at,
         u.user_id AS author_id,
         u.first_name AS author_first_name,
         u.last_name AS author_last_name,
         COUNT(a.id) AS answer_count,
         b.created_at AS bookmarked_at
       FROM question_bookmarks b
       INNER JOIN questions q ON q.id = b.question_id
       INNER JOIN users u ON u.user_id = q.user_id
       LEFT JOIN answers a ON a.question_id = q.id
       WHERE b.user_id = ?
       GROUP BY
         q.id,
         q.question_hash,
         q.title,
         q.content,
         q.created_at,
         q.updated_at,
         u.user_id,
         u.first_name,
         u.last_name,
         b.created_at
       ORDER BY b.created_at DESC`,
      [userId],
    );

    return rows.map((row) => ({
      ...mapQuestionRow(row),
      bookmarkedAt: row.bookmarked_at,
    }));
  },
};

export default Bookmark;
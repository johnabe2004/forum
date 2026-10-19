// Import the MySQL connection pool from the team database configuration.
import pool from "../config/db.js";

// ============================================================
// SHARED SELECT FRAGMENT
// ============================================================
// TASK REQUIREMENT: Retrieves necessary fields for the single question detail view.
// Perfectly mirrors all your teammate's exact selection fields.
const BASE_QUESTION_SELECT = `
  SELECT
    q.id,
    q.question_hash,
    q.title,
    q.content,
    q.user_id,
    q.created_at,
    q.updated_at,
    u.user_id   AS author_id,
    u.first_name AS author_first_name,
    u.last_name  AS author_last_name,
    COUNT(a.id) AS answer_count
  FROM questions q
  INNER JOIN users u ON u.user_id = q.user_id
  LEFT JOIN answers a ON a.question_id = q.id
`;

// ------------------------------------------------------------
// DATA ROW MAPPER FOR FRONTEND COMPATIBILITY
// ------------------------------------------------------------
// TASK REQUIREMENT: Formats database snake_case columns cleanly into camelCase
// objects to match normal JavaScript/JSON frontend conventions.
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

const Question = {
  // ---------------------------------------------------------
  // CREATE QUESTION
  // ---------------------------------------------------------

  async create({ questionHash, userId, title, content }) {
    const [result] = await pool.execute(
      `
      INSERT INTO questions
        (question_hash, user_id, title, content)
      VALUES
        (?, ?, ?, ?)
      `,
      [questionHash, userId, title, content],
    );

    return {
      id: result.insertId,
      questionHash,
      userId,
      title,
      content,
    };
  },

  // ---------------------------------------------------------
  // FIND MANY (WITH OPTIONAL FILTERS)
  // ---------------------------------------------------------

  async findMany({ search, userId }) {
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push("(q.title LIKE ? OR q.content LIKE ?)");
      const likeTerm = `%${search}%`;
      params.push(likeTerm, likeTerm);
    }

    if (userId) {
      conditions.push("q.user_id = ?");
      params.push(userId);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await pool.execute(
      `
      ${BASE_QUESTION_SELECT}
      ${whereClause}
      GROUP BY q.id
      ORDER BY q.created_at DESC
      `,
      params,
    );

    return rows.map(mapQuestionRow);
  },

  // ---------------------------------------------------------
  // FIND BY HASH
  // ---------------------------------------------------------
  async findByHash(questionHash) {
    const [rows] = await pool.execute(
      `
    ${BASE_QUESTION_SELECT}
    WHERE q.question_hash = ?
    GROUP BY q.id
    LIMIT 1
    `,
      [questionHash],
    );

    return rows[0] ? mapQuestionRow(rows[0]) : null;
  },

  // ---------------------------------------------------------
  // FIND BY ID (INTERNAL USE)
  // ---------------------------------------------------------

  async findById(id) {
    const [rows] = await pool.execute(
      `
      ${BASE_QUESTION_SELECT}
      WHERE q.id = ?
      GROUP BY q.id
      LIMIT 1
      `,
      [id],
    );

    return rows[0] ? mapQuestionRow(rows[0]) : null;
  },

  async updateOwnedByHash(questionHash, userId, { title, content }) {
    const [result] = await pool.execute(
      `UPDATE questions
       SET title = ?, content = ?
       WHERE question_hash = ? AND user_id = ?`,
      [title, content, questionHash, userId],
    );

    return result.affectedRows > 0 ? this.findByHash(questionHash) : null;
  },

  async deleteOwnedByHash(questionHash, userId) {
    const [result] = await pool.execute(
      `DELETE FROM questions WHERE question_hash = ? AND user_id = ?`,
      [questionHash, userId],
    );

    return result.affectedRows > 0;
  },

  // ---------------------------------------------------------
  // FIND MANY BY IDS (PRESERVING ORDER)
  // ---------------------------------------------------------

  async findManyByIds(ids) {
    if (!ids || ids.length === 0) {
      return [];
    }

    const placeholders = ids.map(() => "?").join(", ");

    const [rows] = await pool.execute(
      `
      ${BASE_QUESTION_SELECT}
      WHERE q.id IN (${placeholders})
      GROUP BY q.id
      `,
      ids,
    );

    const rowsById = new Map(rows.map((row) => [row.id, mapQuestionRow(row)]));

    return ids
      .map((id) => rowsById.get(id))
      .filter((question) => Boolean(question));
  },
};

export default Question;

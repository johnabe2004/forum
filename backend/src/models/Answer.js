import pool from "../config/db.js";

const ANSWER_SELECT = `
  SELECT
    a.id,
    a.question_id,
    a.user_id,
    a.content,
    a.created_at,
    a.updated_at,
    u.user_id AS author_id,
    u.first_name AS author_first_name,
    u.last_name AS author_last_name
  FROM answers a
  INNER JOIN users u ON u.user_id = a.user_id
`;

const mapAnswerRow = (row) => ({
  id: row.id,
  questionId: row.question_id,
  userId: row.user_id,
  content: row.content,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  author: {
    id: row.author_id,
    firstName: row.author_first_name,
    lastName: row.author_last_name,
  },
});

const Answer = {
  async create({ questionId, userId, content }) {
    const [result] = await pool.execute(
      `
      INSERT INTO answers (question_id, user_id, content)
      VALUES (?, ?, ?)
      `,
      [questionId, userId, content],
    );

    return result.insertId;
  },

  async findById(id) {
    const [rows] = await pool.execute(
      `
      ${ANSWER_SELECT}
      WHERE a.id = ?
      LIMIT 1
      `,
      [id],
    );

    return rows[0] ? mapAnswerRow(rows[0]) : null;
  },

  async findManyByQuestionId(questionId) {
    const [rows] = await pool.execute(
      `
      ${ANSWER_SELECT}
      WHERE a.question_id = ?
      ORDER BY a.created_at ASC, a.id ASC
      `,
      [questionId],
    );

    return rows.map(mapAnswerRow);
  },

  async updateOwned(id, userId, content) {
    const [result] = await pool.execute(
      `UPDATE answers SET content = ? WHERE id = ? AND user_id = ?`,
      [content, id, userId],
    );

    return result.affectedRows > 0 ? this.findById(id) : null;
  },

  async deleteOwned(id, userId) {
    const [result] = await pool.execute(
      `DELETE FROM answers WHERE id = ? AND user_id = ?`,
      [id, userId],
    );

    return result.affectedRows > 0;
  },
};

export default Answer;

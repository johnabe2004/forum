import pool from "../config/db.js";

const REPLY_SELECT = `
  SELECT
    r.id,
    r.answer_id,
    r.user_id,
    r.content,
    r.created_at,
    r.updated_at,
    u.user_id AS author_id,
    u.first_name AS author_first_name,
    u.last_name AS author_last_name
  FROM replies r
  INNER JOIN users u ON u.user_id = r.user_id
`;

const mapReplyRow = (row) => ({
  id: row.id,
  answerId: row.answer_id,
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

const Reply = {
  async create({ answerId, userId, content }) {
    const [result] = await pool.execute(
      `
      INSERT INTO replies (answer_id, user_id, content)
      VALUES (?, ?, ?)
      `,
      [answerId, userId, content],
    );

    return this.findById(result.insertId);
  },

  async findById(id) {
    const [rows] = await pool.execute(
      `
      ${REPLY_SELECT}
      WHERE r.id = ?
      LIMIT 1
      `,
      [id],
    );

    return rows[0] ? mapReplyRow(rows[0]) : null;
  },

  async findManyByAnswerId(answerId) {
    const [rows] = await pool.execute(
      `
      ${REPLY_SELECT}
      WHERE r.answer_id = ?
      ORDER BY r.created_at ASC, r.id ASC
      `,
      [answerId],
    );

    return rows.map(mapReplyRow);
  },
};

export default Reply;

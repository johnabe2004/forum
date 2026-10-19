import pool from "../config/db.js";

const parseEmbedding = (embedding) => {
    if (Array.isArray(embedding)) {
        return embedding;
    }

    if (typeof embedding !== "string") {
        return null;
    }

    try {
        const parsed = JSON.parse(embedding);
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
};

const QuestionVector = {
    // ---------------------------------------------------------
    // FIND QUESTIONS THAT NEED AN EMBEDDING
    // ---------------------------------------------------------

    async findQuestionsNeedingEmbedding(limit = 100) {
        const [rows] = await pool.execute(
            `
            SELECT q.id, q.title, q.content
            FROM questions q
            LEFT JOIN question_vectors qv ON qv.question_id = q.id
            WHERE qv.question_id IS NULL OR qv.status != 'ready' OR qv.embedding IS NULL
            ORDER BY q.created_at ASC
            LIMIT ?
            `,
            [limit],
        );

        return rows.map((row) => ({
            id: Number(row.id),
            title: row.title,
            content: row.content,
        }));
    },

    // ---------------------------------------------------------
    // FIND ALL READY VECTORS
    // ---------------------------------------------------------

    async findAllReady({ excludeQuestionId } = {}) {
        const params = [];
        let whereClause = "WHERE status = 'ready'";

        if (excludeQuestionId) {
            whereClause += " AND question_id != ?";
            params.push(excludeQuestionId);
        }

        const [rows] = await pool.execute(
            `
            SELECT question_id, embedding
            FROM question_vectors
            ${whereClause}
            `,
            params,
        );

        return rows
            .map((row) => ({
                questionId: Number(row.question_id),
                embedding: parseEmbedding(row.embedding),
            }))
            .filter((row) => row.embedding?.length);
    },

    async findByQuestionId(questionId) {
        const [rows] = await pool.execute(
            `
            SELECT question_id, embedding, status
            FROM question_vectors
            WHERE question_id = ?
            LIMIT 1
            `,
            [questionId],
        );
        if (!rows[0]) {
            return null;
        }

        return {
            questionId: Number(rows[0].question_id),
            embedding: parseEmbedding(rows[0].embedding),
            status: rows[0].status,
        };
    },
// ---------------------------------------------------------
  // DELETE BY QUESTION ID (Task T-22 Addition Only)
  // ---------------------------------------------------------
  async deleteByQuestionId(questionId) {
    const [result] = await pool.execute(
      `
      DELETE FROM question_vectors
      WHERE question_id = ?
      `,
      [questionId],
    );

    return result.affectedRows > 0;
  },


    
    async upsert({ questionId, embedding, status }) {
        const serializedEmbedding = Array.isArray(embedding)
            ? JSON.stringify(embedding)
            : null;

        await pool.execute(
            `
            INSERT INTO question_vectors (question_id, embedding, status)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
              embedding = VALUES(embedding),
              status = VALUES(status)
            `,
            [questionId, serializedEmbedding, status],
        );
    },
};

export default QuestionVector;

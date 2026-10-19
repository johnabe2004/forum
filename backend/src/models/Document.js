import pool from "../config/db.js";

const parseEmbedding = (embedding) => {
  const parsed = Array.isArray(embedding) ? embedding : JSON.parse(embedding);

  if (!Array.isArray(parsed) || !parsed.length || !parsed.every(Number.isFinite)) {
    return null;
  }

  return parsed;
};

const mapDocument = (row, { includeStoragePath = false } = {}) => ({
  documentId: Number(row.document_id),
  title: row.title,
  mimeType: row.mime_type,
  byteSize: Number(row.byte_size),
  status: row.status,
  errorMessage: row.error_message,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  ...(includeStoragePath ? { storagePath: row.storage_path } : {}),
});

const mapChatMessage = (row) => ({
  messageId: Number(row.message_id),
  replyToMessageId: row.reply_to_message_id
    ? Number(row.reply_to_message_id)
    : null,
  role: row.role,
  content: row.content,
  citations:
    typeof row.citations === "string"
      ? JSON.parse(row.citations)
      : row.citations || [],
  isGrounded: Boolean(row.is_grounded),
  createdAt: row.created_at,
});

const parsePageNumbers = (pageNumbers) => {
  const parsed =
    typeof pageNumbers === "string" ? JSON.parse(pageNumbers) : pageNumbers;

  return Array.isArray(parsed)
    ? parsed.map(Number).filter((page) => Number.isSafeInteger(page) && page > 0)
    : [];
};

const Document = {
  async create({ userId, title, mimeType, storagePath, byteSize }) {
    const [result] = await pool.execute(
      `INSERT INTO documents
        (user_id, title, mime_type, storage_path, byte_size)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, title, mimeType, storagePath, byteSize],
    );

    return Number(result.insertId);
  },

  async listForUser(userId) {
    const [rows] = await pool.execute(
      `SELECT document_id, title, mime_type, byte_size, status, error_message,
              created_at, updated_at
       FROM documents
       WHERE user_id = ?
       ORDER BY created_at DESC, document_id DESC`,
      [userId],
    );

    return rows.map((row) => mapDocument(row));
  },

  async findByIdForUser(documentId, userId, options = {}) {
    const [rows] = await pool.execute(
      `SELECT document_id, title, mime_type, storage_path, byte_size, status,
              error_message, created_at, updated_at
       FROM documents
       WHERE document_id = ? AND user_id = ?
       LIMIT 1`,
      [documentId, userId],
    );

    return rows[0] ? mapDocument(rows[0], options) : null;
  },

  async updateStatus(documentId, status, errorMessage = null) {
    await pool.execute(
      `UPDATE documents
       SET status = ?, error_message = ?
       WHERE document_id = ?`,
      [status, errorMessage, documentId],
    );
  },

  async addChunk(documentId, chunkIndex, content, pageNumbers = []) {
    const [result] = await pool.execute(
      `INSERT INTO document_chunks
        (document_id, chunk_index, content, page_numbers)
       VALUES (?, ?, ?, ?)`,
      [
        documentId,
        chunkIndex,
        content,
        pageNumbers.length ? JSON.stringify(pageNumbers) : null,
      ],
    );

    return Number(result.insertId);
  },

  async addChunkVector(chunkId, embedding) {
    await pool.execute(
      `INSERT INTO document_chunk_vectors (chunk_id, embedding, status)
       VALUES (?, ?, 'ready')`,
      [chunkId, JSON.stringify(embedding)],
    );
  },

  async findReadyChunks(documentId) {
    const [rows] = await pool.execute(
      `SELECT c.chunk_id, c.chunk_index, c.content, c.page_numbers, v.embedding
       FROM document_chunks c
       INNER JOIN document_chunk_vectors v ON v.chunk_id = c.chunk_id
       WHERE c.document_id = ? AND v.status = 'ready'
       ORDER BY c.chunk_index ASC`,
      [documentId],
    );

    return rows.flatMap((row) => {
      try {
        const embedding = parseEmbedding(row.embedding);
        if (!embedding) return [];

        return [{
          chunkId: Number(row.chunk_id),
          chunkIndex: Number(row.chunk_index),
          content: row.content,
          pageNumbers: parsePageNumbers(row.page_numbers),
          embedding,
        }];
      } catch {
        return [];
      }
    });
  },

  async listChatMessages(documentId) {
    const [rows] = await pool.execute(
      `SELECT message_id, reply_to_message_id, role, content, citations,
              is_grounded, created_at
       FROM document_chat_messages
       WHERE document_id = ?
       ORDER BY message_id ASC`,
      [documentId],
    );

    return rows.map(mapChatMessage);
  },

  async createChatTurn(documentId, query, answer) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const [userResult] = await connection.execute(
        `INSERT INTO document_chat_messages (document_id, role, content)
         VALUES (?, 'user', ?)`,
        [documentId, query],
      );
      await connection.execute(
        `INSERT INTO document_chat_messages
          (document_id, reply_to_message_id, role, content, citations, is_grounded)
         VALUES (?, ?, 'assistant', ?, ?, ?)`,
        [
          documentId,
          userResult.insertId,
          answer.answer,
          JSON.stringify(answer.citations || []),
          answer.isGrounded,
        ],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async updateChatTurn(documentId, messageId, query, answer) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      await connection.execute(
        `DELETE FROM document_chat_messages
         WHERE document_id = ? AND message_id > ?`,
        [documentId, messageId],
      );
      await connection.execute(
        `UPDATE document_chat_messages
         SET content = ?
         WHERE document_id = ? AND message_id = ? AND role = 'user'`,
        [query, documentId, messageId],
      );
      const [assistantRows] = await connection.execute(
        `SELECT message_id
         FROM document_chat_messages
         WHERE document_id = ? AND reply_to_message_id = ? AND role = 'assistant'
         LIMIT 1`,
        [documentId, messageId],
      );

      if (assistantRows.length) {
        await connection.execute(
          `UPDATE document_chat_messages
           SET content = ?, citations = ?, is_grounded = ?
           WHERE message_id = ?`,
          [
            answer.answer,
            JSON.stringify(answer.citations || []),
            answer.isGrounded,
            assistantRows[0].message_id,
          ],
        );
      } else {
        await connection.execute(
          `INSERT INTO document_chat_messages
            (document_id, reply_to_message_id, role, content, citations, is_grounded)
           VALUES (?, ?, 'assistant', ?, ?, ?)`,
          [
            documentId,
            messageId,
            answer.answer,
            JSON.stringify(answer.citations || []),
            answer.isGrounded,
          ],
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async deleteChatMessage(documentId, messageId) {
    const [result] = await pool.execute(
      `DELETE FROM document_chat_messages
       WHERE document_id = ? AND message_id = ?`,
      [documentId, messageId],
    );

    return result.affectedRows > 0;
  },

  async clearChatMessages(documentId) {
    await pool.execute(
      "DELETE FROM document_chat_messages WHERE document_id = ?",
      [documentId],
    );
  },

  async getChatMessage(documentId, messageId) {
    const [rows] = await pool.execute(
      `SELECT message_id, reply_to_message_id, role, content, citations,
              is_grounded, created_at
       FROM document_chat_messages
       WHERE document_id = ? AND message_id = ?
       LIMIT 1`,
      [documentId, messageId],
    );

    return rows[0] ? mapChatMessage(rows[0]) : null;
  },

  async deleteById(documentId, userId) {
    const [result] = await pool.execute(
      `DELETE FROM documents WHERE document_id = ? AND user_id = ?`,
      [documentId, userId],
    );

    return result.affectedRows > 0;
  },
};

export default Document;

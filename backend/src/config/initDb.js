import mysql from "mysql2/promise";
import env from "./env.js";

// Connect to the existing Evangadi Forum database
export async function initializeDatabase() {
  const connection = await mysql.createConnection({
    host: env.database.host,
    port: env.database.port,
    user: env.database.user,
    password: env.database.password,
    database: env.database.name,
  });

  try {
    // Create the users table if it does not already exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,

        email VARCHAR(255) NOT NULL UNIQUE,

        password_hash VARCHAR(255) NOT NULL,

        role VARCHAR(20) NOT NULL DEFAULT 'user',

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP,

        CHECK (email = LOWER(email))
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_unicode_ci
    `);

    console.log("Users table initialized successfully.");

    // Ensure profile columns exist on users table for new features
    const [userColumns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
    `);
    const existingUserCols = new Set(userColumns.map((c) => c.COLUMN_NAME));
    if (!existingUserCols.has("avatar_url")) {
      await connection.query(
        "ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) NULL AFTER email",
      );
    }
    if (!existingUserCols.has("headline")) {
      await connection.query(
        "ALTER TABLE users ADD COLUMN headline VARCHAR(150) NULL",
      );
    }
    if (!existingUserCols.has("bio")) {
      await connection.query("ALTER TABLE users ADD COLUMN bio TEXT NULL");
    }
    if (!existingUserCols.has("location")) {
      await connection.query(
        "ALTER TABLE users ADD COLUMN location VARCHAR(100) NULL",
      );
    }
    if (!existingUserCols.has("github_url")) {
      await connection.query(
        "ALTER TABLE users ADD COLUMN github_url VARCHAR(255) NULL",
      );
    }
    if (!existingUserCols.has("portfolio_url")) {
      await connection.query(
        "ALTER TABLE users ADD COLUMN portfolio_url VARCHAR(255) NULL",
      );
    }

    if (!existingUserCols.has("role")) {
      await connection.query(
        "ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'",
      );
    }

    // Create the questions table if it does not already exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

        question_hash VARCHAR(64) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,

        user_id BIGINT UNSIGNED NOT NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP,

        CONSTRAINT fk_questions_user
          FOREIGN KEY (user_id) REFERENCES users(user_id)
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_unicode_ci
    `);

    // The first schema used CHAR(16), but current public question IDs are
    // 64-character hashes. Expanding the column preserves every existing ID
    // and allows new posts to be created without truncation.
    const [questionHashColumn] = await connection.query(`
      SELECT CHARACTER_MAXIMUM_LENGTH AS max_length
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'questions'
        AND COLUMN_NAME = 'question_hash'
      LIMIT 1
    `);

    if (Number(questionHashColumn[0]?.max_length) < 64) {
      await connection.query(`
        ALTER TABLE questions
        MODIFY question_hash VARCHAR(64) NOT NULL
      `);
      console.log("Expanded questions.question_hash to VARCHAR(64).");
    }

    // Create the question_vectors table if it does not already exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS question_vectors (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        question_id BIGINT UNSIGNED NOT NULL UNIQUE,
        embedding JSON NULL,
        status ENUM('ready', 'failed') NOT NULL DEFAULT 'failed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_question_vectors_question FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE,
        INDEX idx_question_vectors_status (status)
      ) 
      ENGINE = InnoDB DEFAULT 
      CHARSET = utf8mb4 
      COLLATE = utf8mb4_unicode_ci
    `);

    // Create the answers table if it does not already exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS answers (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

        question_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        content TEXT NOT NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP,

        CONSTRAINT fk_answers_question
          FOREIGN KEY (question_id) REFERENCES questions(id),
        CONSTRAINT fk_answers_user
          FOREIGN KEY (user_id) REFERENCES users(user_id)
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS documents (
        document_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        title VARCHAR(512) NOT NULL,
        mime_type VARCHAR(128) NOT NULL DEFAULT 'application/pdf',
        storage_path VARCHAR(1024) NOT NULL,
        byte_size BIGINT UNSIGNED NOT NULL DEFAULT 0,
        status ENUM('processing', 'ready', 'failed') NOT NULL DEFAULT 'processing',
        error_message TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_documents_user
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        INDEX idx_documents_user_created (user_id, created_at)
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        chunk_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        document_id BIGINT UNSIGNED NOT NULL,
        chunk_index INT UNSIGNED NOT NULL,
        content MEDIUMTEXT NOT NULL,
        page_numbers JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_document_chunks_document
          FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE,
        UNIQUE KEY uq_document_chunks_document_index (document_id, chunk_index),
        INDEX idx_document_chunks_document (document_id)
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_unicode_ci
    `);

    const [chunkColumns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'document_chunks'
    `);
    if (!chunkColumns.some((column) => column.COLUMN_NAME === "page_numbers")) {
      await connection.query(
        "ALTER TABLE document_chunks ADD COLUMN page_numbers JSON NULL AFTER content",
      );
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS document_chunk_vectors (
        vector_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        chunk_id BIGINT UNSIGNED NOT NULL,
        embedding JSON NOT NULL,
        status ENUM('ready', 'failed') NOT NULL DEFAULT 'ready',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_document_chunk_vectors_chunk
          FOREIGN KEY (chunk_id) REFERENCES document_chunks(chunk_id) ON DELETE CASCADE,
        UNIQUE KEY uq_document_chunk_vectors_chunk (chunk_id),
        INDEX idx_document_chunk_vectors_status (status)
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS document_chat_messages (
        message_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        document_id BIGINT UNSIGNED NOT NULL,
        reply_to_message_id BIGINT UNSIGNED NULL,
        role ENUM('user', 'assistant') NOT NULL,
        content MEDIUMTEXT NOT NULL,
        citations JSON NULL,
        is_grounded BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_document_chat_document
          FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE,
        CONSTRAINT fk_document_chat_reply
          FOREIGN KEY (reply_to_message_id) REFERENCES document_chat_messages(message_id)
          ON DELETE CASCADE,
        INDEX idx_document_chat_document (document_id, message_id)
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_unicode_ci
    `);

    console.log("Document chat messages table initialized successfully.");

    // Create the replies table if it does not already exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS replies (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        answer_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_replies_answer
          FOREIGN KEY (answer_id) REFERENCES answers(id) ON DELETE CASCADE,
        CONSTRAINT fk_replies_user
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        INDEX idx_replies_answer_id (answer_id)
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_unicode_ci
    `);

    // Create the saved-question table for the bookmark feature.
    // This is idempotent, so existing databases are upgraded automatically
    // without deleting or changing existing questions.
    await connection.query(`
      CREATE TABLE IF NOT EXISTS question_bookmarks (
        user_id BIGINT UNSIGNED NOT NULL,
        question_id BIGINT UNSIGNED NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        PRIMARY KEY (user_id, question_id),

        CONSTRAINT fk_bookmarks_user
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,

        CONSTRAINT fk_bookmarks_question
          FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,

        INDEX idx_bookmarks_user_created (user_id, created_at)
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_unicode_ci
    `);

    console.log("Application and RAG tables initialized successfully.");
  } finally {
    await connection.end();
  }
}

CREATE DATABASE IF NOT EXISTS ai_powered_evangadi_forum;

USE ai_powered_evangadi_forum;

CREATE TABLE IF NOT EXISTS users (
    user_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CHECK (email = LOWER(email))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================================
-- QUESTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS questions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    question_hash VARCHAR(64) NOT NULL UNIQUE,
    user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_questions_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    INDEX idx_questions_user_id (user_id),
    INDEX idx_questions_created_at (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================================
-- QUESTION VECTORS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS question_vectors (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    question_id BIGINT UNSIGNED NOT NULL UNIQUE,
    embedding JSON NULL,
    status ENUM('ready', 'failed') NOT NULL DEFAULT 'failed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_question_vectors_question FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE,
    INDEX idx_question_vectors_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================================
-- ANSWERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS answers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    question_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_answers_question FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE,
    CONSTRAINT fk_answers_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    INDEX idx_answers_question_id (question_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================================
-- RAG DOCUMENTS TABLE
-- ============================================================
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
        FOREIGN KEY (user_id)
        REFERENCES users (user_id)
        ON DELETE CASCADE,

    INDEX idx_documents_user_created (user_id, created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS document_chunks (
    chunk_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    document_id BIGINT UNSIGNED NOT NULL,
    chunk_index INT UNSIGNED NOT NULL,
    content MEDIUMTEXT NOT NULL,
    page_numbers JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_document_chunks_document
        FOREIGN KEY (document_id)
        REFERENCES documents (document_id)
        ON DELETE CASCADE,

    UNIQUE KEY uq_document_chunks_document_index (document_id, chunk_index),
    INDEX idx_document_chunks_document (document_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS document_chunk_vectors (
    vector_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    chunk_id BIGINT UNSIGNED NOT NULL,
    embedding JSON NOT NULL,
    status ENUM('ready', 'failed') NOT NULL DEFAULT 'ready',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_document_chunk_vectors_chunk
        FOREIGN KEY (chunk_id)
        REFERENCES document_chunks (chunk_id)
        ON DELETE CASCADE,

    UNIQUE KEY uq_document_chunk_vectors_chunk (chunk_id),
    INDEX idx_document_chunk_vectors_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

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
        FOREIGN KEY (document_id)
        REFERENCES documents (document_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_document_chat_reply
        FOREIGN KEY (reply_to_message_id)
        REFERENCES document_chat_messages (message_id)
        ON DELETE CASCADE,

    INDEX idx_document_chat_document (document_id, message_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;


-- ============================================================
-- SAVED QUESTIONS / BOOKMARKS TABLE
-- ============================================================
-- One row means one authenticated user saved one question.
-- The composite primary key prevents duplicate saves automatically.
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
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
 
-- ============================================================
-- REPLIES TABLE (Threaded Comments on Answers)
-- ============================================================
CREATE TABLE IF NOT EXISTS replies (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    answer_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_replies_answer FOREIGN KEY (answer_id) REFERENCES answers (id) ON DELETE CASCADE,
    CONSTRAINT fk_replies_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    INDEX idx_replies_answer_id (answer_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;


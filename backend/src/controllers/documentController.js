import fs from "node:fs/promises";
import Document from "../models/Document.js";
import {
  createDocument,
  deleteDocument,
  queryDocument,
  searchDocument,
  summarizeDocument,
} from "../rag/ragService.js";

const getDocumentId = (rawDocumentId) => {
  const documentId = Number(rawDocumentId);

  if (!Number.isSafeInteger(documentId) || documentId < 1) {
    const error = new Error("Document identifier must be a positive integer.");
    error.statusCode = 400;
    throw error;
  }

  return documentId;
};

const getMessageId = (rawMessageId) => {
  const messageId = Number(rawMessageId);

  if (!Number.isSafeInteger(messageId) || messageId < 1) {
    const error = new Error("Message identifier must be a positive integer.");
    error.statusCode = 400;
    throw error;
  }

  return messageId;
};

const findOwnedDocument = async (rawDocumentId, userId, options = {}) => {
  const document = await Document.findByIdForUser(
    getDocumentId(rawDocumentId),
    userId,
    options,
  );

  if (!document) {
    const error = new Error("Document not found.");
    error.statusCode = 404;
    throw error;
  }

  return document;
};

const requireQuery = (rawQuery) => {
  if (typeof rawQuery !== "string" || !rawQuery.trim()) {
    const error = new Error("Please enter a question or search query.");
    error.statusCode = 400;
    throw error;
  }

  const query = rawQuery.trim();
  if (query.length > 2_000) {
    const error = new Error(
      "Questions and search queries must be 2,000 characters or fewer.",
    );
    error.statusCode = 400;
    throw error;
  }

  return query;
};

// The summary instruction is optional; an empty one falls back to a default.
const optionalSummaryPrompt = (rawPrompt) => {
  if (rawPrompt === undefined || rawPrompt === null) return "";

  if (typeof rawPrompt !== "string") {
    const error = new Error("The summary instruction must be text.");
    error.statusCode = 400;
    throw error;
  }

  const prompt = rawPrompt.trim();
  if (prompt.length > 2_000) {
    const error = new Error("Summary instructions must be 2,000 characters or fewer.");
    error.statusCode = 400;
    throw error;
  }

  return prompt;
};

const validateUploadedFile = async (file) => {
  if (file.mimetype === "text/plain") return;

  if (file.mimetype !== "application/pdf") {
    const error = new Error("Only PDF and TXT files are supported.");
    error.statusCode = 400;
    throw error;
  }

  const handle = await fs.open(file.path, "r");

  try {
    const header = Buffer.alloc(5);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);

    if (bytesRead !== header.length || header.toString("ascii") !== "%PDF-") {
      const error = new Error("The uploaded file is not a valid PDF.");
      error.statusCode = 400;
      throw error;
    }
  } finally {
    await handle.close();
  }

};

const listDocuments = async (req, res, next) => {
  try {
    const documents = await Document.listForUser(req.user.userId);

    return res.status(200).json({
      success: true,
      message: "Documents fetched successfully.",
      data: documents,
    });
  } catch (error) {
    return next(error);
  }
};

const getDocument = async (req, res, next) => {
  try {
    const document = await findOwnedDocument(
      req.params.documentId,
      req.user.userId,
    );

    return res.status(200).json({
      success: true,
      message: "Document fetched successfully.",
      data: document,
    });
  } catch (error) {
    return next(error);
  }
};

const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error("A PDF or TXT file is required.");
      error.statusCode = 400;
      throw error;
    }
    await validateUploadedFile(req.file);
    const document = await createDocument({
      userId: req.user.userId,
      file: req.file,
    });

    return res.status(201).json({
      success: true,
      message: "Document uploaded and is being processed.",
      data: document,
    });
  } catch (error) {
    if (req.file?.path) {
      await fs.rm(req.file.path, { force: true }).catch(() => { });
    }

    return next(error);
  }
};

const search = async (req, res, next) => {
  try {
    const document = await findOwnedDocument(
      req.params.documentId,
      req.user.userId,
    );
    const data = await searchDocument(
      document,
      requireQuery(req.query.query),
      req.query.k,
    );

    return res.status(200).json({
      success: true,
      message: "Ranked chunk excerpts.",
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const ask = async (req, res, next) => {
  try {
    const document = await findOwnedDocument(
      req.params.documentId,
      req.user.userId,
    );
    const query = requireQuery(req.body?.query);
    const messageId =
      req.body?.messageId === undefined
        ? null
        : getMessageId(req.body.messageId);
    let history = await Document.listChatMessages(document.documentId);

    if (messageId) {
      const editedMessage = await Document.getChatMessage(
        document.documentId,
        messageId,
      );
      if (!editedMessage || editedMessage.role !== "user") {
        const error = new Error("The chat question could not be found.");
        error.statusCode = 404;
        throw error;
      }
      history = history.filter((message) => message.messageId < messageId);
    }

    const data = await queryDocument(
      document,
      query,
      history.slice(-20).map(({ role, content }) => ({ role, content })),
    );

    if (messageId) {
      await Document.updateChatTurn(
        document.documentId,
        messageId,
        query,
        data,
      );
    } else {
      await Document.createChatTurn(document.documentId, query, data);
    }

    return res.status(200).json({
      success: true,
      message: "Answer generated from document sources.",
      data: {
        ...data,
        messages: await Document.listChatMessages(document.documentId),
      },
    });
  } catch (error) {
    return next(error);
  }
};

const listChatMessages = async (req, res, next) => {
  try {
    const document = await findOwnedDocument(
      req.params.documentId,
      req.user.userId,
    );

    return res.status(200).json({
      success: true,
      message: "Chat history fetched successfully.",
      data: await Document.listChatMessages(document.documentId),
    });
  } catch (error) {
    return next(error);
  }
};

const deleteChatMessage = async (req, res, next) => {
  try {
    const document = await findOwnedDocument(
      req.params.documentId,
      req.user.userId,
    );
    const messageId = getMessageId(req.params.messageId);
    const deleted = await Document.deleteChatMessage(
      document.documentId,
      messageId,
    );

    if (!deleted) {
      const error = new Error("Chat message not found.");
      error.statusCode = 404;
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: "Chat message deleted successfully.",
      data: await Document.listChatMessages(document.documentId),
    });
  } catch (error) {
    return next(error);
  }
};

const clearChatMessages = async (req, res, next) => {
  try {
    const document = await findOwnedDocument(
      req.params.documentId,
      req.user.userId,
    );
    await Document.clearChatMessages(document.documentId);

    return res.status(200).json({
      success: true,
      message: "Chat history cleared successfully.",
      data: [],
    });
  } catch (error) {
    return next(error);
  }
};

const summarize = async (req, res, next) => {
  try {
    const document = await findOwnedDocument(
      req.params.documentId,
      req.user.userId,
      { includeStoragePath: true },
    );
    const data = await summarizeDocument(
      document,
      optionalSummaryPrompt(req.body?.prompt),
    );

    return res.status(200).json({
      success: true,
      message: "Document summary generated.",
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const streamDocument = async (req, res, next) => {
  try {
    const document = await findOwnedDocument(
      req.params.documentId,
      req.user.userId,
      { includeStoragePath: true },
    );

    try {
      await fs.access(document.storagePath);
    } catch (error) {
      if (error.code === "ENOENT") {
        const notFoundError = new Error(
          "The uploaded document file is no longer available.",
        );
        notFoundError.statusCode = 404;
        throw notFoundError;
      }
      throw error;
    }

    res.type(document.mimeType);
    return res.sendFile(document.storagePath, (error) => {
      if (!error) return;
      if (!res.headersSent) return next(error);
      return res.destroy(error);
    });
  } catch (error) {
    return next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const document = await findOwnedDocument(
      req.params.documentId,
      req.user.userId,
      { includeStoragePath: true },
    );
    await deleteDocument(document, req.user.userId);

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully.",
      data: { documentId: document.documentId },
    });
  } catch (error) {
    return next(error);
  }
};

export {
  ask,
  clearChatMessages,
  deleteChatMessage,
  getDocument,
  listChatMessages,
  listDocuments,
  remove,
  search,
  streamDocument,
  summarize,
  uploadDocument,
};

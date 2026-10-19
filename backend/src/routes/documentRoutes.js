import express from "express";
import authenticate from "../middleware/authMiddleware.js";
import {
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
} from "../controllers/documentController.js";
import { draftCoachLimiter } from "../middleware/rateLimiter.js";
import { uploadPdf } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.use(authenticate);

router.get("/", listDocuments);
router.post("/", uploadPdf.single("file"), uploadDocument);
router.get("/:documentId/messages", listChatMessages);
router.delete("/:documentId/messages", clearChatMessages);
router.delete("/:documentId/messages/:messageId", deleteChatMessage);
router.get("/:documentId/search", search);
router.post("/:documentId/query", ask);
router.post("/:documentId/summarize", draftCoachLimiter, summarize);
router.get("/:documentId/file", streamDocument);
router.delete("/:documentId", remove);
router.get("/:documentId", getDocument);

export default router;

import express from "express";


import {
  createAnswer,
  deleteAnswer,
  updateAnswer,
} from "../controllers/answerController.js";

import authenticate from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authenticate, createAnswer);


router.put("/:answerId", authenticate, updateAnswer);



router.delete("/:answerId", authenticate, deleteAnswer);


export default router;
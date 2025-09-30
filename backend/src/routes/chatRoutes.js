import express from "express";
import {
  handleChatQuery,
  testChatQuery,
  getChatHistory,
  validateTenantKey,
} from "../controllers/chatController.js";
import { authenticateToken } from "../middlewares/auth.js";

const router = express.Router();

// Public chat routes (for widget)
router.post("/query", handleChatQuery);
router.get("/validate/:tenantKey", validateTenantKey);
router.get("/history/:sessionId", getChatHistory);

// Protected chat routes (for admin testing)
router.post("/test", authenticateToken, testChatQuery);

export default router;

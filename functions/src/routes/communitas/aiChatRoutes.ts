/* eslint-disable new-cap */
import {Router} from "express";
import {
  createOrAppendAIChat,
  getAIChats,
  getAIChatMessages,
} from "../../controllers/communitas/aiChatController";
import {verifyAccessToken} from "../../middleware/users/authMiddleware";

const router = Router();

// Create or append to an AI chat
router.post("/ai-chats", verifyAccessToken, createOrAppendAIChat);

// Fetch all AI chats for a user
router.get("/ai-chats", verifyAccessToken, getAIChats);

// Fetch messages from a specific AI chat
router.get(
  "/ai-chats/:chatRoomId/messages",
  verifyAccessToken,
  getAIChatMessages
);

export default router;
/* eslint-enable new-cap */

/* eslint-disable new-cap */
import {Router} from "express";
import {
  sendMessage,
  getMessages,
  getChatRooms,
} from "../../controllers/communitas/chatController";
import {verifyAccessToken} from "../../middleware/sessions/authMiddleware";

const router = Router();

// Send a message
router.post("/message", verifyAccessToken, sendMessage);

// Fetch messages for a chat room
router.get("/:chatRoomId/messages", verifyAccessToken, getMessages);

// Fetch chat rooms for a user
router.get("/:userID/chat-rooms", verifyAccessToken, getChatRooms);

export default router;
/* eslint-enable new-cap */

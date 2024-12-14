// src/routes/sessionRoutes.ts
/* eslint-disable new-cap */
import {Router} from "express";
import {
  getSession,
  updateSessionPut,
  updateSessionPatch,
  deleteSession,
} from "../../controllers/sessions/sessionInfoController";
import {verifyAccessToken} from "../../middleware/sessions/authMiddleware"; // Middleware for JWT auth

const router = Router();

// Route for CRUD operations on session
router.get("/:sessionID", verifyAccessToken, getSession); // Get session data
router.put("/:sessionID", verifyAccessToken, updateSessionPut); // Replace session data
router.patch("/:sessionID", verifyAccessToken, updateSessionPatch); // Update part of session data
router.delete("/:sessionID", verifyAccessToken, deleteSession); // Delete session

export default router;
/* eslint-enable new-cap */

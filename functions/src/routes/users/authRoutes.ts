// src/routes/authRoutes.ts
/* eslint-disable new-cap */
import {Router} from "express";
import {
  signUp,
  signIn,
  signOut,
  refreshAccessTokenHandler,
  deleteAccount,
} from "../../controllers/users/authController";
import {verifyAccessToken} from "../../middleware/users/authMiddleware"; // Import the middleware

const router = Router();

router.post("/sign-up", signUp);
router.post("/sign-in", signIn);
router.get("/refresh-token", refreshAccessTokenHandler);

// Protect signOut route with verifyAccessToken middleware
router.delete("/sign-out", verifyAccessToken, signOut);

router.delete("/delete-account", verifyAccessToken, deleteAccount);

export default router;
/* eslint-enable new-cap */

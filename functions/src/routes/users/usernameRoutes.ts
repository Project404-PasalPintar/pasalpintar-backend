/* eslint-disable new-cap */
import {Router} from "express";
import {verifyAccessToken} from "../../middleware/users/authMiddleware"; // Import middleware to protect routes
import {
  verifyUsername,
  changeUsername,
} from "../../controllers/users/usernameController"; // Import the controllers

const router = Router();

router.post("/verify", verifyAccessToken, verifyUsername); // Route to verify username availability
router.post("/change", verifyAccessToken, changeUsername); // Route to change username for authenticated user

export default router;
/* eslint-enable new-cap */

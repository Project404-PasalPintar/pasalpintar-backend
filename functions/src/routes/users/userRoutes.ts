// src/routes/tutorRoutes.ts
/* eslint-disable new-cap */
import {Router} from "express";
import {
  getUserProfile,
  updateTutorProfilePut,
  updateTutorProfilePatch,
  deleteTutorProfile,
  getAllTutors,
} from "../../controllers/users/userController";
import {verifyAccessToken} from "../../middleware/users/authMiddleware"; // Middleware for JWT auth

const router = Router();

// Route for CRUD operations on user profile
router.get("/", verifyAccessToken, getUserProfile); // Get user profile
router.put("/", verifyAccessToken, updateTutorProfilePut); // Full update of user profile
router.patch("/", verifyAccessToken, updateTutorProfilePatch); // Partial update of user profile
router.delete("/", verifyAccessToken, deleteTutorProfile); // Delete user profile

router.get("/all", verifyAccessToken, getAllTutors);

export default router;
/* eslint-enable new-cap */

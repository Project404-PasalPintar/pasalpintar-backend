// src/routes/tutorRoutes.ts
/* eslint-disable new-cap */
import {Router} from "express";
import {
  getLawyerProfile,
  updateTutorProfilePut,
  updateTutorProfilePatch,
  deleteTutorProfile,
  getAllTutors,
} from "../../controllers/lawyers/lawyerController";
import {verifyAccessToken} from "../../middleware/sessions/authMiddleware"; // Middleware for JWT auth

const router = Router();

// Route for CRUD operations on lawyer profile
router.get("/", verifyAccessToken, getLawyerProfile); // Get lawyer profile
router.put("/", verifyAccessToken, updateTutorProfilePut); // Full update of lawyer profile
router.patch("/", verifyAccessToken, updateTutorProfilePatch); // Partial update of lawyer profile
router.delete("/", verifyAccessToken, deleteTutorProfile); // Delete lawyer profile

router.get("/all", verifyAccessToken, getAllTutors);

export default router;
/* eslint-enable new-cap */

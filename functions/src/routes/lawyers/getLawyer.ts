// src/routes/tutorRoutes.ts
/* eslint-disable new-cap */
import {Router} from "express";
import {
  getAllTutors,
  getLawyerProfileById,
} from "../../controllers/lawyers/lawyerController";
import {verifyAccessToken} from "../../middleware/users/authMiddleware"; // Middleware for JWT auth

const router = Router();

// Route for CRUD operations on lawyer profile
router.get("/all", verifyAccessToken, getAllTutors);
router.get("/:lawyerId", verifyAccessToken, getLawyerProfileById);

export default router;
/* eslint-enable new-cap */

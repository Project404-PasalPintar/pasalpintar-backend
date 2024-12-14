/* eslint-disable new-cap */
import {Router} from "express";
import {verifyAccessToken} from "../../middleware/users/authMiddleware"; // Middleware to protect routes
import {
  generateProfilePicUploadUrl,
  saveProfilePicUrl,
  deleteProfilePic,
} from "../../controllers/users/profilePictureController";

const router = Router();

router.post(
  "/profile-pic/upload-url",
  verifyAccessToken,
  generateProfilePicUploadUrl
);

// New endpoint to save profile picture URL
router.post("/profile-pic/save-url", verifyAccessToken, saveProfilePicUrl);

router.delete("/profile-pic", verifyAccessToken, deleteProfilePic);

export default router;
/* eslint-enable new-cap */

/* eslint-disable new-cap */
import {Router} from "express";
import {verifyAccessToken} from "../../middleware/users/authMiddleware";
import {changePassword} from "../../controllers/users/passwordController";

const router = Router();

// Change password route
router.post("/change", verifyAccessToken, changePassword);

export default router;
/* eslint-enable new-cap */

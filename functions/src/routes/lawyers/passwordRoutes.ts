/* eslint-disable new-cap */
import {Router} from "express";
import {verifyAccessToken} from "../../middleware/lawyers/authMiddleware";
import {changePassword} from "../../controllers/lawyers/passwordController";

const router = Router();

// Change password route
router.post("/change", verifyAccessToken, changePassword);

export default router;
/* eslint-enable new-cap */

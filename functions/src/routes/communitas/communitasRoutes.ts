// src/routes/chatRoutes.ts
/* eslint-disable new-cap */
import {Router} from "express";
import {
  createCommunityPost,
  getAllCommunityPosts,
  addCommentToPost,
  getCommentsByPost,
} from "../../controllers/communitas/communitasController";
import {verifyAccessToken} from "../../middleware/users/authMiddleware";

const router = Router();

// Community post routes
router.post("/", verifyAccessToken, createCommunityPost);
router.get("/", verifyAccessToken, getAllCommunityPosts);

// Comment routes
router.post("/:postID/comment", verifyAccessToken, addCommentToPost);
router.get("/:postID/comments", verifyAccessToken, getCommentsByPost);

export default router;
/* eslint-enable new-cap */

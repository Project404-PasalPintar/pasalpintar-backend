import {Request, Response} from "express";
import * as admin from "firebase-admin";

// Create a new community post
export const createCommunityPost = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {title, question} = req.body;
    const userID = (req.user as { userID: string })?.userID;

    if (!title || !question) {
      res.status(400).json({
        status: "fail",
        message: "Both title and question are required.",
      });
      return;
    }

    const communityPostRef = admin
      .firestore()
      .collection("testing")
      .doc("chat")
      .collection("communitas")
      .doc();

    const newPost = {
      id: communityPostRef.id,
      title,
      question,
      creatorID: userID,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await communityPostRef.set(newPost);

    res.status(201).json({
      status: "success",
      message: "Community post created successfully.",
      data: newPost,
    });
  } catch (error) {
    console.error("Error creating community post:", error);
    res.status(500).json({
      status: "fail",
      message: "Failed to create community post.",
      error: error instanceof Error ? error.message : "Unknown error.",
    });
  }
};

// Get all community posts
export const getAllCommunityPosts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const postsRef = admin
      .firestore()
      .collection("testing")
      .doc("chat")
      .collection("communitas");

    const snapshot = await postsRef.orderBy("createdAt", "desc").get();

    if (snapshot.empty) {
      res.status(404).json({
        status: "fail",
        message: "No community posts found.",
      });
      return;
    }

    const posts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate().toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate().toISOString() || null,
    }));

    res.status(200).json({
      status: "success",
      message: "Community posts fetched successfully.",
      data: posts,
    });
  } catch (error) {
    console.error("Error fetching community posts:", error);
    res.status(500).json({
      status: "fail",
      message: "Failed to fetch community posts.",
      error: error instanceof Error ? error.message : "Unknown error.",
    });
  }
};

// Add a comment to a community post
export const addCommentToPost = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {postID} = req.params;
    const {comment} = req.body;
    const userID = (req.user as { userID: string })?.userID;

    if (!postID || !comment) {
      res.status(400).json({
        status: "fail",
        message: "Both post ID and comment are required.",
      });
      return;
    }

    const commentRef = admin
      .firestore()
      .collection("testing")
      .doc("chat")
      .collection("communitas")
      .doc(postID)
      .collection("comments")
      .doc();

    const newComment = {
      id: commentRef.id,
      comment,
      commenterID: userID,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await commentRef.set(newComment);

    res.status(201).json({
      status: "success",
      message: "Comment added successfully.",
      data: newComment,
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({
      status: "fail",
      message: "Failed to add comment.",
      error: error instanceof Error ? error.message : "Unknown error.",
    });
  }
};

// Get all comments for a specific post
export const getCommentsByPost = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {postID} = req.params;

    if (!postID) {
      res.status(400).json({
        status: "fail",
        message: "Post ID is required.",
      });
      return;
    }

    const commentsRef = admin
      .firestore()
      .collection("testing")
      .doc("chat")
      .collection("communitas")
      .doc(postID)
      .collection("comments");

    const snapshot = await commentsRef.orderBy("createdAt", "asc").get();

    if (snapshot.empty) {
      res.status(404).json({
        status: "fail",
        message: "No comments found for this post.",
      });
      return;
    }

    const comments = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const commentData = doc.data();
        const {commenterID} = commentData;

        const user = {username: null, profilePic: null}; // Default user info
        if (commenterID) {
          const userRef = admin
            .firestore()
            .collection("testing")
            .doc("data")
            .collection("users")
            .doc(commenterID);

          const userSnapshot = await userRef.get();
          if (userSnapshot.exists) {
            const userData = userSnapshot.data();
            user.username = userData?.username || null;
            user.profilePic = userData?.profilePic || null;
          }
        }

        return {
          id: doc.id,
          ...commentData,
          ...user,
          createdAt: commentData?.createdAt?.toDate().toISOString() || null,
        };
      })
    );

    res.status(200).json({
      status: "success",
      message: "Comments fetched successfully.",
      data: comments,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({
      status: "fail",
      message: "Failed to fetch comments.",
      error: error instanceof Error ? error.message : "Unknown error.",
    });
  }
};

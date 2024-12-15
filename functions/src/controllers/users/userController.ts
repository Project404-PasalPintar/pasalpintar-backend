// src/controllers/users/tutorController.ts
import {Request, Response} from "express";
import * as admin from "firebase-admin";
import {getStorage} from "firebase-admin/storage";
import deleteCollectionRecursively from "../../utils/deleteCollectionRecursively";

// get all users
export const getAllTutors = async (req: Request, res: Response) => {
  try {
    // Default limit to 3 users
    const limit = parseInt(req.query.limit as string) || 2;

    const usersRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("users")
      .limit(limit);
    const snapshot = await usersRef.get();

    if (snapshot.empty) {
      return res.status(404).json({
        status: "fail",
        message: "No users found.",
      });
    }

    const users = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ?
        doc.data().createdAt.toDate().toISOString() :
        null,
      updatedAt: doc.data().updatedAt ?
        doc.data().updatedAt.toDate().toISOString() :
        null,
    }));

    return res.status(200).json({
      status: "success",
      message: "users retrieved successfully",
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message: error instanceof Error ? error.message : "Failed to get users",
    });
  }
};

// Get user data
// Get user data
export const getUserProfile = async (req: Request, res: Response) => {
  const userID = (req.user as { userID: string }).userID;

  try {
    const UserRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("users")
      .doc(userID);
    const userDoc = await UserRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({
        status: "fail",
        message: "User not found.",
      });
    }

    const userData = userDoc.data();

    const createdAt = userData?.createdAt ?
      userData.createdAt.toDate().toISOString() :
      null;
    const updatedAt = userData?.updatedAt ?
      userData.updatedAt.toDate().toISOString() :
      null;

    return res.status(200).json({
      status: "success",
      message: "User profile retrieved successfully.",
      data: {
        userID, // Include the userID in the response
        ...userData,
        createdAt,
        updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message:
        error instanceof Error ? error.message : "Failed to get user profile",
    });
  }
};

// Update user data with PUT (replace entire document)
export const updateTutorProfilePut = async (req: Request, res: Response) => {
  const userID = (req.user as { userID: string }).userID;
  const newTutorData = req.body;

  try {
    const UserRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("users")
      .doc(userID);
    const userDoc = await UserRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({
        status: "fail",
        message: "user not found.",
      });
    }

    // Preserve createdAt, but update updatedAt
    const existingTutorData = userDoc.data();
    const createdAt =
      existingTutorData?.createdAt ||
      admin.firestore.FieldValue.serverTimestamp();
    const updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await UserRef.set(
      {
        ...newTutorData,
        createdAt, // Do not change createdAt
        updatedAt, // Always update updatedAt
      },
      {merge: false}
    ); // Replace the document except createdAt

    return res.status(200).json({
      status: "success",
      message: "user profile updated successfully",
      data: {
        userID: userID,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message:
        error instanceof Error ?
          error.message :
          "Failed to update user profile",
    });
  }
};

// Partially update user data with PATCH
export const updateTutorProfilePatch = async (req: Request, res: Response) => {
  const userID = (req.user as { userID: string }).userID;
  const updateData = req.body;

  try {
    const UserRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("users")
      .doc(userID);
    const userDoc = await UserRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({
        status: "fail",
        message: "user not found.",
      });
    }

    // Always update the updatedAt field
    const updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await UserRef.update({
      ...updateData,
      updatedAt, // Always update updatedAt when updating data
    });

    return res.status(200).json({
      status: "success",
      message: "user profile partially updated",
      data: {
        userID: userID,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message:
        error instanceof Error ?
          error.message :
          "Failed to update user profile",
    });
  }
};

// Delete user profile
export const deleteTutorProfile = async (req: Request, res: Response) => {
  const userID = (req.user as { userID: string }).userID;

  try {
    const UserRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("users")
      .doc(userID);

    // Hapus subcollection 'userData' secara rekursif
    await deleteCollectionRecursively(UserRef);

    // Hapus folder user di Cloud Storage
    const bucket = getStorage().bucket();
    const folderPath = `testing/${userID}/`;
    await bucket.deleteFiles({
      prefix: folderPath,
    });

    // Hapus akun user dari Firebase Authentication
    await admin.auth().deleteUser(userID);

    await UserRef.delete();
    return res.status(200).json({
      status: "success",
      message: "user profile deleted",
    });
  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message:
        error instanceof Error ?
          error.message :
          "Failed to delete user profile",
    });
  }
};

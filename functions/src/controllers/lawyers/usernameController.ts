import {Request, Response} from "express";
import * as admin from "firebase-admin";

// Verify if a username is available
export const verifyUsername = async (req: Request, res: Response) => {
  const {username} = req.body;

  if (!username) {
    return res.status(400).json({
      status: "fail",
      message: "Username is required.",
    });
  }

  try {
    // Query the Firestore collection to check if the username exists in profileToValidate subcollection
    const lawyersRef = admin
      .firestore()
      .collectionGroup("lawyers")
      .where("username", "==", username);
    const querySnapshot = await lawyersRef.get();

    if (!querySnapshot.empty) {
      // Username is already taken
      return res.status(409).json({
        status: "fail",
        message: "Username is already taken.",
      });
    }

    // Username is available
    return res.status(200).json({
      status: "success",
      message: "Username is available.",
    });
  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message:
        error instanceof Error ? error.message : "Failed to verify username.",
    });
  }
};

// Change username for the authenticated user in profileToValidate subcollection
export const changeUsername = async (req: Request, res: Response) => {
  const userID = (req.user as { userID: string }).userID;
  const {username} = req.body;

  if (!username) {
    return res.status(400).json({
      status: "fail",
      message: "Username is required.",
    });
  }

  try {
    // Query the Firestore collection to check if the username exists in profileToValidate subcollection
    const lawyersRef = admin
      .firestore()
      .collectionGroup("lawyers")
      .where("username", "==", username);
    const querySnapshot = await lawyersRef.get();

    if (!querySnapshot.empty) {
      // Username is already taken
      return res.status(409).json({
        status: "fail",
        message: "Username is already taken.",
      });
    }

    // Update the username in the profileToValidate subcollection for the authenticated user
    const profileDocRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("lawyers")
      .doc(userID);

    await profileDocRef.update({
      username: username,
      usernameToReview: true, // Optionally, set this for review
      usernameValid: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(), // Update the timestamp
    });

    return res.status(200).json({
      status: "success",
      message: "Username changed successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message:
        error instanceof Error ? error.message : "Failed to change username.",
    });
  }
};

// src/controllers/authController.ts
import {Request, Response} from "express";
import {
  signUpUser,
  signInUser,
  refreshAccessToken,
  signOutUser,
} from "../../services/users/authService";
import * as jwt from "jsonwebtoken";
import * as admin from "firebase-admin";

export const signUp = async (req: Request, res: Response) => {
  const {email, password, firstName, lastName} = req.body;
  try {
    const uid = await signUpUser({email, password, firstName, lastName}, res);

    // Pastikan uid ada sebelum melanjutkan
    if (!uid) {
      return; // Jika ada error, respon sudah dikirim oleh signUpUser
    }

    return res.status(201).json({
      status: "success",
      message: "user registered successfully",
      data: {
        userID: uid,
        email,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const signIn = async (req: Request, res: Response) => {
  const {email, password, fcmToken} = req.body; // Pastikan fcmToken diambil dari body request
  try {
    const result = await signInUser(email, password, fcmToken, res); // Kirim fcmToken sebagai argumen ke-3

    if (!result) {
      return; // Respon sudah dikirim di signInUser jika terjadi error
    }

    const {accessToken, refreshToken, userData} = result;

    return res.status(200).json({
      status: "success",
      message: "Login successful",
      data: {
        userData,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const signOut = async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  // const refreshToken = req.cookies.refreshToken;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      status: "fail",
      message:
        "Unauthorized. Please provide `refreshToken` on headers before request",
    });
  }

  // if (!refreshToken) {
  //   return res.status(401).json({
  //     status: "fail",
  //     message: "Refresh token is required for signing out.",
  //   });
  // }

  const token = authHeader.split(" ")[1];

  try {
    await signOutUser(token, res);
    return;
  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message: "Internal server error",
    });
  }
};

export const refreshAccessTokenHandler = async (
  req: Request,
  res: Response
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      status: "fail",
      message:
        "Unauthorized. Please provide `refreshToken` on headers before request",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Panggil fungsi service untuk refresh token
    const {accessToken, refreshToken} = await refreshAccessToken(token, res);

    return res.status(200).json({
      status: "success",
      message: "Refresh token successfully",
      data: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    // Tangani error Invalid Refresh Token
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({
        status: "fail",
        message: "Invalid or expired refresh token",
      });
    }

    // Jika error bertipe unknown, cek apakah memiliki properti `message`
    if (error instanceof Error && error.message === "Invalid refresh token.") {
      return res.status(403).json({
        status: "fail",
        message: "Invalid or expired refresh token",
      });
    }

    // Tangani error lainnya
    return res.status(500).json({
      status: "fail",
      message: "Internal server error",
    });
  }
};

export const deleteAccount = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userID = (req.user as { userID: string })?.userID;

    if (!userID) {
      res.status(400).json({
        status: "fail",
        message: "User ID is required to delete the account.",
      });
      return;
    }

    // Delete user data from Firestore
    const userDocRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("users")
      .doc(userID);
    const userDocSnapshot = await userDocRef.get();

    if (!userDocSnapshot.exists) {
      res.status(404).json({
        status: "fail",
        message: "User account does not exist in Firestore.",
      });
      return;
    }

    // Delete all associated files from Storage
    const bucket = admin.storage().bucket();
    const [files] = await bucket.getFiles({prefix: `testing/${userID}/`});

    await Promise.all(
      files.map((file) =>
        file
          .delete()
          .catch((err) =>
            console.error(`Failed to delete file: ${file.name}`, err)
          )
      )
    );

    console.log(`Deleted all files for user ${userID} from Storage.`);

    // Delete Firestore user document
    await userDocRef.delete();
    console.log(`Deleted user document for ${userID} from Firestore.`);

    // Delete user from Firebase Authentication
    await admin.auth().deleteUser(userID);
    console.log(`Deleted user ${userID} from Firebase Authentication.`);

    res.status(200).json({
      status: "success",
      message:
        "Account successfully deleted from Authentication, Firestore, and Storage.",
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({
      status: "fail",
      message: "Failed to delete the account.",
      error: error instanceof Error ? error.message : "Unknown error.",
    });
  }
};

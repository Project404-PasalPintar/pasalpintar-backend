// src/controllers/authController.ts
import {Request, Response} from "express";
import {
  signUpLawyer,
  signInLawyer,
  refreshAccessToken,
  signOutLawyer,
} from "../../services/lawyers/lawyerAuthService";
import * as jwt from "jsonwebtoken";
import * as admin from "firebase-admin";

export const signUp = async (req: Request, res: Response) => {
  const {email, password, firstName, lastName} = req.body;
  try {
    const uid = await signUpLawyer(
      {email, password, firstName, lastName},
      res
    );

    // Pastikan uid ada sebelum melanjutkan
    if (!uid) {
      return; // Jika ada error, respon sudah dikirim oleh signUpLawyer
    }

    return res.status(201).json({
      status: "success",
      message: "lawyer registered successfully",
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
    const result = await signInLawyer(email, password, fcmToken, res); // Kirim fcmToken sebagai argumen ke-3

    if (!result) {
      return; // Respon sudah dikirim di signInLawyer jika terjadi error
    }

    const {accessToken, refreshToken, lawyerData} = result;

    return res.status(200).json({
      status: "success",
      message: "Login successful",
      data: {
        lawyerData,
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
    await signOutLawyer(token, res);
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
        message: "lawyer ID is required to delete the account.",
      });
      return;
    }

    // Delete lawyer data from Firestore
    const userDocRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("lawyers")
      .doc(userID);
    const userDocSnapshot = await userDocRef.get();

    if (!userDocSnapshot.exists) {
      res.status(404).json({
        status: "fail",
        message: "lawyer account does not exist in Firestore.",
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

    console.log(`Deleted all files for lawyer ${userID} from Storage.`);

    // Delete Firestore lawyer document
    await userDocRef.delete();
    console.log(`Deleted lawyer document for ${userID} from Firestore.`);

    // Delete lawyer from Firebase Authentication
    await admin.auth().deleteUser(userID);
    console.log(`Deleted lawyer ${userID} from Firebase Authentication.`);

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

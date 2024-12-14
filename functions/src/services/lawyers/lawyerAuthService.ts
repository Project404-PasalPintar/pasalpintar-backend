// src/services/authService.ts
import * as admin from "firebase-admin";
import * as jwt from "jsonwebtoken";
import {lawyer} from "../../types/lawyers/lawyerTypes";
import * as dotenv from "dotenv";
import {Response} from "express";
import fetch from "node-fetch"; // Importing node-fetch version 2
import {getStorage} from "firebase-admin/storage";

dotenv.config();

const API_KEY = process.env.API_KEY || "";
const JWT_ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_TOKEN_SECRET || "";
const JWT_REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_TOKEN_SECRET || "";

if (!JWT_ACCESS_TOKEN_SECRET || !JWT_REFRESH_TOKEN_SECRET) {
  throw new Error("JWT secrets are not defined in the environment variables.");
}

// Utility function to generate a username
const generateUsername = (email: string) => {
  const baseUsername = email.split("@")[0];
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${baseUsername}${randomSuffix}`;
};

interface FirebaseLoginResponse {
  localId: string;
  email?: string;
  idToken?: string;
  refreshToken?: string;
  error?: { message: string };
}

export const signUpLawyer = async (newTutorData: lawyer, res: Response) => {
  try {
    // Create a new lawyer in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: newTutorData.email,
      password: newTutorData.password,
    });

    await admin.auth().setCustomUserClaims(userRecord.uid, {role: "lawyer"});

    const username = generateUsername(newTutorData.email);

    // Use userRecord.uid as the document ID in the 'lawyers' collection
    const tutorDocRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("lawyers")
      .doc(userRecord.uid);

    // Buat folder di Cloud Storage berdasarkan UID
    const bucket = getStorage().bucket();
    const folderPath = `testing/${userRecord.uid}/`;
    await bucket
      .file(`${folderPath}README.txt`)
      .save("This is the root folder for lawyer " + userRecord.uid);

    await tutorDocRef.set({
      // Personal information
      firstName: newTutorData.firstName,
      lastName: newTutorData.lastName,
      email: newTutorData.email,
      username: username,
      description: "",

      fullName: "",

      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      refreshToken: null,

      profilePic: "",
      balance: 0,
      isOnline: false,
      fcmToken: "",
    });

    return userRecord.uid;
  } catch (error: unknown) {
    // Pastikan error memiliki properti 'code'
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "auth/email-already-exists"
    ) {
      res.status(409).json({
        status: "fail",
        message: "The email address is already in use by another account.",
      });
      return;
    }
    // Tangkap error umum lainnya sebagai Internal Server Error
    res.status(500).json({
      status: "fail",
      message: "Internal server error",
    });
    return;
  }
};

export const signInLawyer = async (
  email: string,
  password: string,
  fcmToken: string,
  res: Response
) => {
  const apiKey = API_KEY;
  try {
    const loginResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          email: email,
          password: password,
          returnSecureToken: true,
        }),
      }
    );

    const responseData = (await loginResponse.json()) as FirebaseLoginResponse;

    // Jika response dari Firebase menunjukkan kesalahan login
    if (!loginResponse.ok) {
      if (
        responseData.error?.message === "INVALID_PASSWORD" ||
        responseData.error?.message === "EMAIL_NOT_FOUND" ||
        responseData.error?.message === "INVALID_LOGIN_CREDENTIALS"
      ) {
        // Invalid email or password, kembalikan status 404
        res.status(404).json({
          status: "fail",
          message: "Invalid email or password",
        });
        return; // Pastikan return di sini
      } else {
        // Kesalahan lain, kembalikan status 500
        res.status(500).json({
          status: "fail",
          message: "Internal server error",
        });
        return; // Pastikan return di sini
      }
    }

    const userRecord = await admin.auth().getUser(responseData.localId);

    // Gunakan userRecord.uid untuk mendapatkan data lawyer dari Firestore
    const tutorDocRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("lawyers")
      .doc(userRecord.uid);
    const lawyerDoc = await tutorDocRef.get();

    if (!lawyerDoc.exists) {
      throw new Error("lawyer data is missing.");
    }

    const payloadJwt = {
      userID: userRecord.uid,
      email: userRecord.email,
      role: "lawyer",
    };

    const accessToken = jwt.sign(payloadJwt, JWT_ACCESS_TOKEN_SECRET, {
      expiresIn: "1h",
    });

    const refreshToken = jwt.sign(payloadJwt, JWT_REFRESH_TOKEN_SECRET, {
      expiresIn: "30d",
    });

    // Update refresh token in Firestore
    await tutorDocRef.update({
      refreshToken: refreshToken,
    });

    await tutorDocRef.update({
      fcmToken: fcmToken || null, // Simpan fcmToken di dokumen utama lawyers
    });

    const lawyerData = lawyerDoc.data();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Convert Firestore Timestamps to ISO strings
    const formattedTutorData = {
      userID: userRecord.uid,
      ...lawyerData,
      createdAt: lawyerData?.createdAt?.toDate().toISOString(),
      updatedAt: lawyerData?.updatedAt?.toDate().toISOString(),
      fcmToken: fcmToken || null,
    };

    // Return the tokens and lawyer data
    return {
      accessToken,
      refreshToken,
      lawyerData: formattedTutorData,
    };
  } catch (error) {
    // Jika terjadi kesalahan di luar invalid email/password, kembalikan status 500
    res.status(500).json({
      status: "fail",
      message: "Internal server error",
    });
    return; // Pastikan return di sini
  }
};

export const refreshAccessToken = (
  token: string,
  res: Response
): Promise<{ accessToken: string; refreshToken: string }> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_REFRESH_TOKEN_SECRET, async (err, lawyer) => {
      if (err) {
        // Tangani JsonWebTokenError dan kirimkan reject dengan pesan 403
        if (err instanceof jwt.JsonWebTokenError) {
          return reject(
            new jwt.JsonWebTokenError("Invalid or expired refresh token")
          );
        }
        // Tangani error lainnya
        return reject(new Error("Invalid refresh token."));
      }

      const userID = (lawyer as jwt.JwtPayload).userID;

      try {
        const tutorDocRef = admin
          .firestore()
          .collection("testing")
          .doc("data")
          .collection("lawyers")
          .doc(userID);

        const profileDoc = await tutorDocRef.get();

        if (!profileDoc.exists) {
          return reject(new Error("lawyer data is missing."));
        }

        const lawyer = profileDoc.data();

        if (lawyer?.refreshToken !== token) {
          return reject(new Error("Invalid refresh token."));
        }

        // Generate new access token
        const newAccessToken = jwt.sign(
          {
            userID: userID,
            email: (lawyer as jwt.JwtPayload).email,
            role: (lawyer as jwt.JwtPayload).role,
          },
          JWT_ACCESS_TOKEN_SECRET,
          {expiresIn: "1h"}
        );

        // Generate new refresh token
        const newRefreshToken = jwt.sign(
          {
            userID: userID,
            email: (lawyer as jwt.JwtPayload).email,
            role: (lawyer as jwt.JwtPayload).role,
          },
          JWT_REFRESH_TOKEN_SECRET,
          {expiresIn: "30d"}
        );

        // Update refresh token in Firestore
        await tutorDocRef.update({
          refreshToken: newRefreshToken,
        });

        // Set new refresh token in cookie
        res.cookie("refreshToken", newRefreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        resolve({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        });
      } catch (error) {
        console.error("Error refreshing token: ", error);
        reject(new Error("Error refreshing access token."));
      }
    });
  });
};

export const signOutLawyer = async (token: string, res: Response) => {
  try {
    const decodedToken = jwt.verify(
      token,
      JWT_REFRESH_TOKEN_SECRET
    ) as jwt.JwtPayload;

    const userID = decodedToken.userID;

    // Retrieve the lawyer document to verify the refresh token
    const tutorDocRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("lawyers")
      .doc(userID);
    const profileDoc = await tutorDocRef.get();

    if (!profileDoc.exists) {
      // lawyer tidak ditemukan
      res.status(401).json({
        status: "fail",
        message:
          "Unauthorized. Please provide `refreshToken` on headers before request",
      });
      return;
    }

    const lawyer = profileDoc.data();

    // Check if the provided refresh token matches the one stored in Firestore
    if (lawyer?.refreshToken !== token) {
      res.status(403).json({
        status: "fail",
        message: "Invalid or expired refresh token",
      });
      return;
    }

    // Clear the refresh token in Firestore
    await tutorDocRef.update({
      refreshToken: null,
    });

    await tutorDocRef.update({
      fcmToken: null,
    });

    // Clear the refresh token cookie
    res.clearCookie("refreshToken");

    res.status(200).json({
      status: "success",
      message: "Success signout lawyer",
    });
  } catch (error: unknown) {
    if (error instanceof jwt.JsonWebTokenError) {
      // Jika token invalid atau expired
      res.status(403).json({
        status: "fail",
        message: "Invalid or expired refresh token",
      });
    } else {
      // Internal server error
      res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }
};

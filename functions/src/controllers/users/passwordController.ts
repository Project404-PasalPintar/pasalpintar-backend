import {Request, Response} from "express";
import * as admin from "firebase-admin";
import * as bcrypt from "bcrypt";
import fetch from "node-fetch"; // For Firebase Auth REST API

const API_KEY = process.env.API_KEY || ""; // Make sure API_KEY is set in your environment variables

export const changePassword = async (req: Request, res: Response) => {
  const userID = (req.user as { userID: string }).userID;
  const {currentPassword, newPassword} = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      status: "fail",
      message: "Current password and new password are required.",
    });
  }

  try {
    // Get the user's email from Firebase Authentication
    const userRecord = await admin.auth().getUser(userID);
    const email = userRecord.email;

    if (!email) {
      return res.status(404).json({
        status: "fail",
        message: "User email not found.",
      });
    }

    // Verify current password using Firebase Authentication's signInWithPassword API
    const loginResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
      {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          email: email,
          password: currentPassword,
          returnSecureToken: true,
        }),
      }
    );

    await loginResponse.json();

    if (!loginResponse.ok) {
      return res.status(403).json({
        status: "fail",
        message: "Current password is incorrect.",
      });
    }

    // Ensure the new password is different from the current password
    const isSamePassword = await bcrypt.compare(newPassword, currentPassword);
    if (isSamePassword) {
      return res.status(400).json({
        status: "fail",
        message: "New password must be different from the current password.",
      });
    }

    // Update the password in Firebase Authentication
    await admin.auth().updateUser(userID, {
      password: newPassword,
    });

    return res.status(200).json({
      status: "success",
      message: "Password changed successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message:
        error instanceof Error ? error.message : "Failed to change password.",
    });
  }
};

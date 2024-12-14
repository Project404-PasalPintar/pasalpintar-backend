// src/controllers/sessionInfoController.ts
import {Request, Response} from "express";
import * as admin from "firebase-admin";
import * as dotenv from "dotenv";
import {sendNotificationToStudent} from "../../helpers/sessions/notificationSession";

dotenv.config();

const AGORA_APP_ID = process.env.AGORA_APP_ID || "";
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || "";

if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
  throw new Error(
    "Agora credentials are not defined in environment variables."
  );
}

// Get session data by sessionID
export const getSession = async (req: Request, res: Response) => {
  const {sessionID} = req.params;

  try {
    const sessionRef = admin.firestore().collection("sessions").doc(sessionID);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return res.status(404).json({
        status: "fail",
        message: "Session not found.",
      });
    }

    const sessionData = sessionDoc.data();

    if (!sessionData) {
      return res.status(500).json({
        status: "fail",
        message: "Failed to retrieve session data.",
      });
    }

    // Ambil data user dari Firestore berdasarkan studentID dari session
    const studentID = sessionData.studentID;
    const userRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("users")
      .doc(studentID);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({
        status: "fail",
        message: "user not found.",
      });
    }

    const userData = userDoc.data();
    const {firstName, lastName, profilePic} = userData || {};

    // Konversi Firestore Timestamps menjadi ISO String
    const createdAt = sessionData?.createdAt?.toDate ?
      sessionData.createdAt.toDate().toISOString() :
      null;
    const updatedAt = sessionData?.updatedAt?.toDate ?
      sessionData.updatedAt.toDate().toISOString() :
      null;
    const startTime = sessionData?.startTime?.toDate ?
      sessionData.startTime.toDate().toISOString() :
      null;
    const endTime = sessionData?.endTime?.toDate ?
      sessionData.endTime.toDate().toISOString() :
      null;

    // Return the session data along with user info
    return res.status(200).json({
      status: "success",
      message: "Session retrieved successfully",
      data: {
        agoraAppID: AGORA_APP_ID,
        ...sessionData,
        createdAt,
        updatedAt,
        startTime,
        endTime,
        user: {
          firstName,
          lastName,
          profilePic,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message:
        error instanceof Error ? error.message : "Failed to get session data",
    });
  }
};

// Update session data with PUT (replace entire document)
export const updateSessionPut = async (req: Request, res: Response) => {
  const {sessionID} = req.params;
  const newSessionData = req.body;

  try {
    const sessionRef = admin.firestore().collection("sessions").doc(sessionID);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return res.status(404).json({
        status: "fail",
        message: "Session not found.",
      });
    }

    const existingSessionData = sessionDoc.data();

    await sessionRef.set(
      {
        ...newSessionData,
        createdAt:
          existingSessionData?.createdAt ||
          admin.firestore.FieldValue.serverTimestamp(), // Preserve createdAt
        updatedAt: admin.firestore.FieldValue.serverTimestamp(), // Always update updatedAt
      },
      {merge: false}
    );

    return res.status(200).json({
      status: "success",
      message: "Session data replaced successfully",
      data: {
        sessionID: sessionID,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message:
        error instanceof Error ?
          error.message :
          "Failed to update session data",
    });
  }
};

// Partially update session data with PATCH
export const updateSessionPatch = async (req: Request, res: Response) => {
  const {sessionID} = req.params;
  const updateData = req.body;

  try {
    const sessionRef = admin.firestore().collection("sessions").doc(sessionID);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return res.status(404).json({
        status: "fail",
        message: "Session not found.",
      });
    }

    const existingSessionData = sessionDoc.data();

    // If the status is being updated to "In Progress", set startTime and send FCM notification
    let additionalData = {};
    if (
      updateData.status === "In Progress" &&
      existingSessionData?.status !== "In Progress"
    ) {
      additionalData = {
        startTime: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Retrieve user data to send notification
      const studentID = existingSessionData?.studentID;
      const userRef = admin
        .firestore()
        .collection("testing")
        .doc("data")
        .collection("users")
        .doc(studentID);

      const userDoc = await userRef.get();
      const userData = userDoc.data();

      if (userData?.fcmToken) {
        await sendNotificationToStudent(
          userData.fcmToken,
          sessionID,
          existingSessionData?.lawyerID
        );
      }
    }

    await sessionRef.update({
      ...updateData,
      ...additionalData,
      createdAt:
        existingSessionData?.createdAt ||
        admin.firestore.FieldValue.serverTimestamp(), // Preserve createdAt
      updatedAt: admin.firestore.FieldValue.serverTimestamp(), // Always update updatedAt
    });

    return res.status(200).json({
      status: "success",
      message: "Session data updated successfully",
      data: {
        sessionID: sessionID,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message:
        error instanceof Error ?
          error.message :
          "Failed to update session data",
    });
  }
};

// Delete session by sessionID
export const deleteSession = async (req: Request, res: Response) => {
  const {sessionID} = req.params;

  try {
    const sessionRef = admin.firestore().collection("sessions").doc(sessionID);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return res.status(404).json({
        status: "fail",
        message: "Session not found.",
      });
    }

    await sessionRef.delete();
    return res.status(200).json({
      status: "success",
      message: "Session deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message:
        error instanceof Error ? error.message : "Failed to delete session",
    });
  }
};

// src/controllers/meetingController.ts
import {Request, Response} from "express";
import * as admin from "firebase-admin";
// src/controllers/meetingController.ts
import {
  sendTutorLeaveNotificationToStudent,
  sendStudentLeaveNotificationToTutor,
  sendTutorRejoinNotificationToStudent,
  sendStudentRejoinNotificationToTutor,
} from "../../helpers/sessions/notificationSession";

export const leaveSession = async (req: Request, res: Response) => {
  const {sessionID, role, reason, type} = req.body;

  try {
    const sessionRef = admin.firestore().collection("sessions").doc(sessionID);
    const sessionDoc = await sessionRef.get();
    const sessionData = sessionDoc.data();

    if (!sessionData) {
      return res
        .status(404)
        .json({status: "fail", message: "Session not found."});
    }

    const studentID = sessionData.studentID;
    const lawyerID = sessionData.lawyerID;
    const userRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("users")
      .doc(studentID);
    const lawyerRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("lawyers")
      .doc(lawyerID);
    const userDoc = await userRef.get();
    const lawyerDoc = await lawyerRef.get();

    const studentFCMToken = userDoc.data()?.fcmToken;
    const tutorFCMToken = lawyerDoc.data()?.fcmToken;

    // Use type directly for customization; role identifies whether it's a user or lawyer
    if (role === "lawyer" && studentFCMToken) {
      await sendTutorLeaveNotificationToStudent(
        studentFCMToken,
        sessionID,
        reason,
        type
      );
    } else if (role === "user" && tutorFCMToken) {
      await sendStudentLeaveNotificationToTutor(
        tutorFCMToken,
        sessionID,
        reason,
        type
      );
    }

    const pausedIntervals = sessionData.pausedIntervals || [];

    // Add a new interval with the current timestamp as the start of the pause
    pausedIntervals.push({start: Date.now()});

    await sessionRef.update({
      pausedIntervals,
      [`${type}LeaveReason`]: reason,
      status: "Paused",
    });

    return res.status(200).json({
      status: "success",
      message: "Session paused and notification sent.",
    });
  } catch (error) {
    console.error("Error in leaveSession:", error);
    return res
      .status(500)
      .json({status: "fail", message: "Failed to notify and pause session."});
  }
};

export const rejoinSession = async (req: Request, res: Response) => {
  const {sessionID, type} = req.body;

  try {
    const sessionRef = admin.firestore().collection("sessions").doc(sessionID);
    const sessionDoc = await sessionRef.get();
    const sessionData = sessionDoc.data();

    if (!sessionData) {
      return res
        .status(404)
        .json({status: "fail", message: "Session not found."});
    }

    const studentID = sessionData.studentID;
    const lawyerID = sessionData.lawyerID;
    const userRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("users")
      .doc(studentID);
    const lawyerRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("lawyers")
      .doc(lawyerID);
    const userDoc = await userRef.get();
    const lawyerDoc = await lawyerRef.get();

    const studentFCMToken = userDoc.data()?.fcmToken;
    const tutorFCMToken = lawyerDoc.data()?.fcmToken;

    if (type === "lawyer" && studentFCMToken) {
      await sendTutorRejoinNotificationToStudent(studentFCMToken, sessionID);
    } else if (type === "user" && tutorFCMToken) {
      await sendStudentRejoinNotificationToTutor(tutorFCMToken, sessionID);
    }

    const pausedIntervals = sessionData.pausedIntervals || [];

    // Complete the latest interval by adding the current timestamp as the end
    if (pausedIntervals.length > 0) {
      const lastInterval = pausedIntervals[pausedIntervals.length - 1];
      if (!lastInterval.end) {
        lastInterval.end = Date.now();
      }
    }

    await sessionRef.update({
      pausedIntervals,
      status: "In Progress", // Resume session status
    });

    return res.status(200).json({
      status: "success",
      message: "Session resumed and notification sent.",
    });
  } catch (error) {
    console.error("Error in rejoinSession:", error);
    return res.status(500).json({
      status: "fail",
      message: "Failed to notify and resume session.",
    });
  }
};

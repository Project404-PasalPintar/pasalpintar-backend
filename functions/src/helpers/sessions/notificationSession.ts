// src/controllers/notificationSessions.ts
import * as admin from "firebase-admin";

// Function to send push notification to lawyer
export const sendNotificationToTutor = async (
  lawyerID: string,
  sessionID: string,
  question: string,
  studentID: string
) => {
  const lawyerRef = admin
    .firestore()
    .collection("testing")
    .doc("data")
    .collection("lawyers")
    .doc(lawyerID);
  const lawyerDoc = await lawyerRef.get();
  const lawyerData = lawyerDoc.data();

  // Get the user name from Firestore
  const userRef = admin
    .firestore()
    .collection("testing")
    .doc("data")
    .collection("users")
    .doc(studentID);
  const userDoc = await userRef.get();
  const userData = userDoc.data();
  const userFirstName = userData?.firstName || "user";
  const userLastName = userData?.lastName || "";

  // Limit question length for FCM notification body
  const maxQuestionLength = 200;
  let truncatedQuestion = question;
  if (question.length > maxQuestionLength) {
    truncatedQuestion = question.substring(0, maxQuestionLength) + "...";
  }

  if (lawyerData?.fcmToken) {
    const message = {
      notification: {
        // Kamu dapat sesi dari {nama user}
        title: `You have a session from ${userFirstName} ${userLastName}`,
        body: truncatedQuestion,
      },
      data: {
        sessionID: sessionID,
        question: truncatedQuestion, // Masukkan truncated question juga dalam data jika diperlukan
        type: "request_meeting",
      },
      token: lawyerData.fcmToken,
    };

    try {
      await admin.messaging().send(message);
      console.log(`Notification sent to lawyer (lawyerID: ${lawyerID})`);
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  }
};

export const sendNotificationToStudent = async (
  fcmToken: string,
  sessionID: string,
  lawyerID: string
) => {
  const message = {
    notification: {
      title: "Session Accepted",
      body: "Your lawyer has accepted the session request.",
    },
    data: {
      sessionID,
      lawyerID,
      type: "meeting_started",
    },
    token: fcmToken,
  };

  try {
    await admin.messaging().send(message);
    console.log("Notification sent to user for session acceptance.");
  } catch (error) {
    console.error("Error sending notification to user:", error);
  }
};

// Helper function to send notification to user when session ends
export const sendEndSessionNotificationToStudent = async (
  fcmToken: string,
  sessionID: string,
  lawyerID: string,
  sessionTime: string,
  costs: number,
  sessionEarning: number,
  platformFee: number
) => {
  const message = {
    // notification: {
    //   title: "Session Ended",
    //   body: "Your session with the lawyer has ended.",
    // },
    data: {
      sessionID,
      lawyerID,
      sessionTime,
      costs: costs.toString(),
      sessionEarning: sessionEarning.toString(),
      platformFee: platformFee.toString(),
      type: "meeting_ended",
    },
    token: fcmToken,
  };

  try {
    await admin.messaging().send(message);
    console.log("End session notification sent to user.");
  } catch (error) {
    console.error("Error sending end session notification to user:", error);
  }
};

// Send notification to the lawyer when the user ends the session
export const sendEndSessionNotificationToTutor = async (
  fcmToken: string,
  sessionID: string,
  studentID: string,
  sessionTime: string,
  costs: number,
  sessionEarning: number,
  platformFee: number
) => {
  const message = {
    // notification: {
    //   title: "Session Ended",
    //   body: "Your session with the lawyer has ended.",
    // },
    data: {
      sessionID,
      studentID,
      sessionTime,
      costs: costs.toString(),
      sessionEarning: sessionEarning.toString(),
      platformFee: platformFee.toString(),
      type: "meeting_ended_by_student",
    },
    token: fcmToken,
  };

  try {
    await admin.messaging().send(message);
    console.log("End session notification sent to lawyer.");
  } catch (error) {
    console.error("Error sending end session notification to lawyer:", error);
  }
};

// Notifikasi ketika lawyer meninggalkan meeting
export const sendTutorLeaveNotificationToStudent = async (
  fcmToken: string,
  sessionID: string,
  reason: string,
  type: string
) => {
  const message = {
    // notification: {
    //   title: "lawyer Left Meeting",
    //   body: `Your lawyer left the meeting. Reason: ${reason}`,
    // },
    data: {
      sessionID,
      type,
      reason,
    },
    token: fcmToken,
  };

  try {
    await admin.messaging().send(message);
    console.log("lawyer left meeting notification sent to user.");
  } catch (error) {
    console.error("Error sending lawyer left meeting notification:", error);
  }
};

// Notifikasi ketika user meninggalkan meeting
export const sendStudentLeaveNotificationToTutor = async (
  fcmToken: string,
  sessionID: string,
  reason: string,
  type: string
) => {
  const message = {
    // notification: {
    //   title: "user Left Meeting",
    //   body: `Your user left the meeting. Reason: ${reason}`,
    // },
    data: {
      sessionID,
      type,
      reason,
    },
    token: fcmToken,
  };

  try {
    await admin.messaging().send(message);
    console.log("user left meeting notification sent to lawyer.");
  } catch (error) {
    console.error("Error sending user left meeting notification:", error);
  }
};

// Notifikasi ketika lawyer kembali ke meeting
export const sendTutorRejoinNotificationToStudent = async (
  fcmToken: string,
  sessionID: string
) => {
  const message = {
    notification: {
      title: "lawyer Rejoined Meeting",
      body: "Your lawyer has rejoined the meeting.",
    },
    data: {
      sessionID,
      type: "tutor_rejoined_meeting",
    },
    token: fcmToken,
  };

  try {
    await admin.messaging().send(message);
    console.log("lawyer rejoined meeting notification sent to user.");
  } catch (error) {
    console.error("Error sending lawyer rejoined meeting notification:", error);
  }
};

// Notifikasi ketika user kembali ke meeting
export const sendStudentRejoinNotificationToTutor = async (
  fcmToken: string,
  sessionID: string
) => {
  const message = {
    notification: {
      title: "user Rejoined Meeting",
      body: "Your user has rejoined the meeting.",
    },
    data: {
      sessionID,
      type: "student_rejoined_meeting",
    },
    token: fcmToken,
  };

  try {
    await admin.messaging().send(message);
    console.log("user rejoined meeting notification sent to lawyer.");
  } catch (error) {
    console.error("Error sending user rejoined meeting notification:", error);
  }
};

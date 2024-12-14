// src/controllers/tutorStatisticsController.ts
import {Request, Response} from "express";
import * as admin from "firebase-admin";

// Helper to get today's date range
const getTodayRange = () => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return {
    start: admin.firestore.Timestamp.fromDate(startOfDay),
    end: admin.firestore.Timestamp.fromDate(endOfDay),
  };
};

// Get lawyer statistics
export const getTutorStatistics = async (req: Request, res: Response) => {
  const {lawyerID} = req.params;

  if (!lawyerID) {
    return res.status(400).json({
      status: "fail",
      message: "lawyer ID is required.",
    });
  }

  try {
    const db = admin.firestore();

    // Fetch lawyer document
    const lawyerRef = db
      .collection("testing")
      .doc("data")
      .collection("lawyers")
      .doc(lawyerID);
    const lawyerDoc = await lawyerRef.get();

    if (!lawyerDoc.exists) {
      return res.status(404).json({
        status: "fail",
        message: "lawyer not found.",
      });
    }

    const lawyerData = lawyerDoc.data();

    // Query sessions by lawyer ID
    const sessionsSnapshot = await db
      .collection("sessions")
      .where("lawyerID", "==", lawyerID)
      .get();

    const totalSessions = sessionsSnapshot.size;

    // Today's sessions
    const todayRange = getTodayRange();
    const todaySessionsSnapshot = await db
      .collection("sessions")
      .where("lawyerID", "==", lawyerID)
      .where("createdAt", ">=", todayRange.start)
      .where("createdAt", "<=", todayRange.end)
      .get();

    const todaySessions = todaySessionsSnapshot.docs.map((doc) => doc.data());

    // Calculate total earnings and time
    let totalEarnings = 0;
    let totalEarningsToday = 0;
    let totalTimeInSeconds = 0;

    sessionsSnapshot.docs.forEach((doc) => {
      const session = doc.data();
      totalEarnings += session.sessionEarning || 0;
      const sessionTimeInSeconds = convertTimeToSeconds(
        session.sessionTime || "00:00:00"
      );
      totalTimeInSeconds += sessionTimeInSeconds;
    });

    todaySessions.forEach((session) => {
      totalEarningsToday += session.sessionEarning || 0;
    });

    // Convert totalTimeInSeconds to HH:mm:ss format
    const formattedTotalTime = formatSecondsToTime(totalTimeInSeconds);

    // Respond with statistics
    return res.status(200).json({
      status: "success",
      message: "lawyer statistics retrieved successfully.",
      data: {
        totalSessions,
        rating: lawyerData?.rating || 0,
        followers: lawyerData?.followers || 0,
        todaySessions: todaySessions.length,
        totalTime: formattedTotalTime, // Correctly formatted total time
        totalEarnings,
        totalEarningsToday,
      },
    });
  } catch (error) {
    console.error("Error fetching lawyer statistics:", error);
    return res.status(500).json({
      status: "fail",
      message:
        error instanceof Error ?
          error.message :
          "Failed to fetch lawyer statistics.",
    });
  }
};

// Helper: Convert HH:mm:ss to seconds
const convertTimeToSeconds = (time: string): number => {
  const [hours, minutes, seconds] = time.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
};

// Helper: Convert seconds to HH:mm:ss format
const formatSecondsToTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
};

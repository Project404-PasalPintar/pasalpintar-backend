import {Request, Response} from "express";
import * as admin from "firebase-admin";

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

export const getMonthlySummary = async (req: Request, res: Response) => {
  const {lawyerID} = req.params;
  const {year} = req.query;

  if (!year) {
    return res.status(400).json({
      status: "fail",
      message: "Year is required.",
    });
  }

  try {
    const db = admin.firestore();

    // Query all sessions for the lawyer in the given year
    const startOfYear = new Date(Number(year), 0, 1, 0, 0, 0);
    const endOfYear = new Date(Number(year), 11, 31, 23, 59, 59);

    const sessionsSnapshot = await db
      .collection("sessions")
      .where("lawyerID", "==", lawyerID)
      .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(startOfYear))
      .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(endOfYear))
      .get();

    const monthlySummary: {
      [month: string]: {
        totalSessions: number;
        totalMinutes: string;
        totalEarnings: number;
      };
    } = {};

    // Aggregate data by month
    sessionsSnapshot.docs.forEach((doc) => {
      const session = doc.data();
      const createdAt = session.createdAt?.toDate();

      if (createdAt) {
        const month = createdAt.getMonth(); // 0-based month (0 = January, 11 = December)
        const key = month.toString();

        if (!monthlySummary[key]) {
          monthlySummary[key] = {
            totalSessions: 0,
            totalMinutes: "00:00:00",
            totalEarnings: 0,
          };
        }

        const sessionTimeInSeconds = convertTimeToSeconds(
          session.sessionTime || "00:00:00"
        );
        const previousTotalSeconds = convertTimeToSeconds(
          monthlySummary[key].totalMinutes
        );

        monthlySummary[key].totalSessions += 1;
        monthlySummary[key].totalMinutes = formatSecondsToTime(
          previousTotalSeconds + sessionTimeInSeconds
        );
        monthlySummary[key].totalEarnings += session.sessionEarning || 0;
      }
    });

    // Format response
    const result = Object.keys(monthlySummary)
      .sort((a, b) => Number(a) - Number(b))
      .map((monthKey) => ({
        month: Number(monthKey) + 1, // Convert 0-based month to 1-based
        ...monthlySummary[monthKey],
      }));

    return res.status(200).json({
      status: "success",
      message: "Monthly summary retrieved successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching monthly summary:", error);
    return res.status(500).json({
      status: "fail",
      message: "Failed to retrieve monthly summary.",
    });
  }
};

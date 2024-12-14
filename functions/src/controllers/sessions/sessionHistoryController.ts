import {Request, Response} from "express";
import * as admin from "firebase-admin";

export const getTutorSessionHistory = async (req: Request, res: Response) => {
  const {lawyerID} = req.params;
  const {month, year, pageSize = 10, lastSessionID} = req.query;

  if (!year) {
    return res.status(400).json({
      status: "fail",
      message: "Year is required.",
    });
  }

  try {
    // Define start and end date range based on whether month is provided
    const startOfRange = new Date(
      Number(year),
      month ? Number(month) - 1 : 0,
      1
    );
    const endOfRange = month ?
      new Date(Number(year), Number(month), 0, 23, 59, 59) : // End of the month
      new Date(Number(year), 11, 31, 23, 59, 59); // End of the year if month is not specified

    const db = admin.firestore();

    // Base query for sessions
    let query = db
      .collection("sessions")
      .where("lawyerID", "==", lawyerID)
      .where(
        "createdAt",
        ">=",
        admin.firestore.Timestamp.fromDate(startOfRange)
      )
      .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(endOfRange))
      .orderBy("createdAt", "desc") // Sort sessions by creation date (newest first)
      .limit(Number(pageSize));

    // If lastSessionID is provided, paginate starting after the specified session
    if (lastSessionID) {
      if (typeof lastSessionID !== "string") {
        return res.status(400).json({
          status: "fail",
          message: "Invalid lastSessionID format. Must be a string.",
        });
      }

      const lastSessionDoc = await db
        .collection("sessions")
        .doc(lastSessionID)
        .get();
      if (lastSessionDoc.exists) {
        query = query.startAfter(lastSessionDoc);
      } else {
        return res.status(400).json({
          status: "fail",
          message: "Invalid lastSessionID provided.",
        });
      }
    }

    // Execute the query
    const sessionsSnapshot = await query.get();

    // Map through the sessions and fetch additional user data
    const sessions = await Promise.all(
      sessionsSnapshot.docs.map(async (doc) => {
        const sessionData = doc.data();

        // Retrieve user data
        const studentID = sessionData.studentID;
        const userRef = db
          .collection("testing")
          .doc("data")
          .collection("users")
          .doc(studentID);

        const userDoc = await userRef.get();
        const userData = userDoc.exists ? userDoc.data() : null;

        const {firstName, lastName, profilePic} = userData || {};

        // Convert timestamps to ISO strings if they exist
        return {
          sessionID: doc.id,
          ...sessionData,
          createdAt: sessionData.createdAt?.toDate().toISOString(),
          updatedAt: sessionData.updatedAt?.toDate().toISOString(),
          startTime: sessionData.startTime?.toDate().toISOString(),
          endTime: sessionData.endTime?.toDate().toISOString(),
          user: {
            firstName,
            lastName,
            profilePic,
          },
        };
      })
    );

    // Fetch the last document's ID for pagination
    const lastVisibleDoc =
      sessionsSnapshot.docs[sessionsSnapshot.docs.length - 1];

    return res.status(200).json({
      status: "success",
      message: "lawyer session history retrieved successfully",
      data: sessions,
      pagination: {
        nextPageToken: lastVisibleDoc?.id || null, // Provide last session ID for next page
      },
    });
  } catch (error) {
    console.error("Error retrieving lawyer session history:", error);
    return res.status(500).json({
      status: "fail",
      message:
        error instanceof Error ?
          error.message :
          "Failed to retrieve session history",
    });
  }
};

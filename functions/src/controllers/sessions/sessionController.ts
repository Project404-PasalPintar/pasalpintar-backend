// src/controllers/sessionController.ts
import {Request, Response} from "express";
import * as admin from "firebase-admin";
import * as dotenv from "dotenv";
import {
  sendNotificationToTutor,
  sendEndSessionNotificationToStudent,
  sendNotificationToStudent,
  sendEndSessionNotificationToTutor,
} from "../../helpers/sessions/notificationSession";
import {generateAgoraTokensAndChannel} from "../../helpers/sessions/generateTokenSession";
import {makeFilePublic} from "../../helpers/users/makeFilePublic";
import {generateSignedUrlWrite} from "../../helpers/users/generateSignedUrl";

dotenv.config();

const AGORA_APP_ID = process.env.AGORA_APP_ID || "";
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || "";

if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
  throw new Error(
    "Agora credentials are not defined in environment variables."
  );
}

// Start Session with specified lawyerID
export const startSession = async (req: Request, res: Response) => {
  const studentID = (req.user as { userID: string }).userID;
  const lawyerID = req.body.lawyerID;
  const fileUrls = req.body.fileUrls || [];

  if (!lawyerID) {
    return res.status(400).json({
      status: "fail",
      message: "lawyer ID is required.",
    });
  }

  const question = req.body.question || "";
  const studentCountry = req.body.studentCountry || "";
  const languages = req.body.languages || "";
  const subjects = req.body.subjects || "";
  const topics = req.body.topics || [];
  const age = req.body.age || 0;

  try {
    const lawyerDoc = await admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("lawyers")
      .doc(lawyerID)
      .get();

    if (!lawyerDoc.exists || !lawyerDoc.data()?.isOnline) {
      return res.status(404).json({
        status: "fail",
        message: "Requested lawyer is not available or not online.",
      });
    }

    const sessionsSnapshot = await admin
      .firestore()
      .collection("sessions")
      .where("lawyerID", "==", lawyerID)
      .where("status", "==", "In Progress")
      .get();

    if (!sessionsSnapshot.empty) {
      return res.status(400).json({
        status: "fail",
        message: "The requested lawyer is currently busy with another session.",
      });
    }

    const {
      agoraRtcTokenStudent,
      agoraRtcTokenTutor,
      channelName,
      studentUid,
      tutorUid,
    } = generateAgoraTokensAndChannel(studentID, lawyerID);

    const sessionRef = admin.firestore().collection("sessions").doc();
    const sessionID = sessionRef.id;
    const sessionDate = admin.firestore.FieldValue.serverTimestamp();

    const sessionData = {
      sessionID,
      studentID,
      lawyerID,
      channelName,
      startTime: null,
      status: "Pending",
      fileUrls: [],
      question,
      studentCountry,
      languages,
      subjects,
      topics,
      age,
      costs: 0,
      isSolved: false,
      sessionEarning: 0,
      studentReview: {},
      tutorReview: {},
      sessionTime: 0,
      createdAt: sessionDate,
      updatedAt: sessionDate,
      agoraRtcTokenStudent,
      agoraRtcTokenTutor,
      studentUid,
      tutorUid,
      agoraAppID: AGORA_APP_ID,
    };

    await sessionRef.set(sessionData);

    const savedSessionDoc = await sessionRef.get();
    const savedSessionData = savedSessionDoc.data();

    if (!savedSessionData) {
      return res.status(500).json({
        status: "fail",
        message: "Error retrieving session data after saving.",
      });
    }

    // Retrieve user information
    const userRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("users")
      .doc(studentID);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (!userData) {
      return res.status(404).json({
        status: "fail",
        message: "user not found.",
      });
    }

    const {firstName, lastName, profilePic} = userData;

    // Calculate total sessions between user and lawyer
    const totalSessions = await countTotalSessionsBetweenStudentAndTutor(
      studentID,
      lawyerID
    );

    const formattedSessionData = {
      ...savedSessionData,
      fileUrls,
      createdAt: savedSessionData.createdAt.toDate().toISOString(),
      updatedAt: savedSessionData.updatedAt.toDate().toISOString(),
      user: {
        totalSessions,
        firstName,
        lastName,
        profilePic,
      },
    };

    // Send notification to lawyer
    await sendNotificationToTutor(lawyerID, sessionID, question, studentID);

    return res.status(200).json({
      status: "success",
      message: "Session started",
      data: formattedSessionData,
    });
  } catch (error) {
    console.error("Error in startSession:", error);
    return res.status(500).json({
      status: "fail",
      message: "Failed to start session",
    });
  }
};

// Create Random lawyer Search with handling for rejected lawyers
export const createRandomTutorSearch = async (req: Request, res: Response) => {
  const studentID = (req.user as { userID: string }).userID;
  const {
    question,
    studentCountry,
    languages,
    subjects,
    topics,
    age,
    searchID,
  } = req.body;

  // Validate languages and subjects to ensure they are arrays
  if (
    !Array.isArray(languages) ||
    !Array.isArray(subjects) ||
    !Array.isArray(topics)
  ) {
    return res.status(400).json({
      status: "fail",
      message:
        "Invalid data type for 'languages', 'subjects' & 'topics'. Must be arrays.",
    });
  }

  try {
    // Retrieve rejected lawyers if `searchID` is provided
    let searchRef;
    let rejectedTutors: string[] = [];
    if (searchID) {
      searchRef = admin.firestore().collection("sessionTmp").doc(searchID);
      const searchDoc = await searchRef.get();

      if (searchDoc.exists) {
        rejectedTutors = searchDoc.data()?.rejectedTutors || [];
      } else {
        return res.status(404).json({
          status: "fail",
          message: "Specified searchID not found.",
        });
      }
    } else {
      // Create a new sessionTmp document if `searchID` is not provided
      searchRef = admin.firestore().collection("sessionTmp").doc();
    }

    const matchingTutors = await findTutorsMatchingCriteria(
      languages,
      subjects,
      topics
    );

    // Filter out lawyers who have already rejected the session
    const availableTutors = matchingTutors.filter(
      (lawyer) => !rejectedTutors.includes(lawyer.lawyerID)
    );

    if (availableTutors.length === 0) {
      return res.status(404).json({
        status: "fail",
        message: "No lawyers available matching criteria.",
      });
    }

    // Select the first available lawyer
    const selectedTutor = availableTutors[0];

    const {
      agoraRtcTokenStudent,
      agoraRtcTokenTutor,
      channelName,
      studentUid,
      tutorUid,
    } = generateAgoraTokensAndChannel(studentID, selectedTutor.lawyerID);

    // Update existing `sessionTmp` document or create a new one
    await searchRef.set(
      {
        studentID,
        question,
        studentCountry,
        languages,
        subjects,
        topics,
        age,
        lawyerID: selectedTutor.lawyerID,
        status: "Pending",
        createdAt: searchID ?
          admin.firestore.FieldValue.serverTimestamp() :
          admin.firestore.FieldValue.serverTimestamp(),
        agoraRtcTokenStudent,
        agoraRtcTokenTutor,
        channelName,
        studentUid,
        tutorUid,
        rejectedTutors,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true} // Merge data if `searchID` is provided to update only specific fields
    );

    // Retrieve user data
    const userRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("users")
      .doc(studentID);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (!userData) {
      return res.status(404).json({
        status: "fail",
        message: "user not found.",
      });
    }

    const {
      firstName: userFirstName,
      lastName: userLastName,
      profilePic: studentProfilePic,
    } = userData;
    const totalSessions = await countTotalSessionsBetweenStudentAndTutor(
      studentID,
      selectedTutor.lawyerID
    );

    // Retrieve lawyer details for response
    const lawyerRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("lawyers")
      .doc(selectedTutor.lawyerID);
    const lawyerDoc = await lawyerRef.get();
    const lawyerData = lawyerDoc.data();

    if (!lawyerData) {
      return res.status(404).json({
        status: "fail",
        message: "lawyer not found.",
      });
    }

    const {
      username,
      firstName,
      lastName,
      profilePic,
      subjects: tutorSubjects,
      languages: tutorLanguages,
      topics: tutorTopics,
    } = lawyerData;

    // Send notification to the new lawyer
    await sendNotificationToTutor(
      selectedTutor.lawyerID,
      searchRef.id,
      question,
      studentID
    );

    return res.status(200).json({
      status: "success",
      message: searchID ?
        "lawyer updated in existing sessionTmp" :
        "Random lawyer search created",
      data: {
        searchID: searchRef.id,
        lawyerID: selectedTutor.lawyerID,
        agoraRtcTokenStudent,
        agoraRtcTokenTutor,
        channelName,
        studentUid,
        tutorUid,
        user: {
          totalSessions,
          firstName: userFirstName,
          lastName: userLastName,
          profilePic: studentProfilePic,
        },
        lawyer: {
          username,
          firstName,
          lastName,
          profilePic,
          subjects: tutorSubjects,
          languages: tutorLanguages,
          topics: tutorTopics,
        },
      },
    });
  } catch (error) {
    console.error("Error in createRandomTutorSearch:", error);
    return res.status(500).json({
      status: "fail",
      message:
        error instanceof Error ?
          error.message :
          "Failed to create or update lawyer search",
    });
  }
};

// Function to count total number of sessions between a user and a lawyer
const countTotalSessionsBetweenStudentAndTutor = async (
  studentID: string,
  lawyerID: string
): Promise<number> => {
  try {
    const sessionsSnapshot = await admin
      .firestore()
      .collection("sessions")
      .where("studentID", "==", studentID)
      .where("lawyerID", "==", lawyerID)
      .get();

    // Return the total number of sessions
    return sessionsSnapshot.size; // size will give you the total number of matching documents
  } catch (error) {
    console.error("Error counting sessions between user and lawyer:", error);
    return 0; // Return 0 if there's an error
  }
};

// Helper function to find lawyers matching criteria
const findTutorsMatchingCriteria = async (
  languages: string[],
  subjects: string[],
  topics: string[]
): Promise<FirebaseFirestore.DocumentData[]> => {
  if (
    !Array.isArray(languages) ||
    !Array.isArray(subjects) ||
    !Array.isArray(topics)
  ) {
    throw new Error("languages, subjects, and topics must all be arrays.");
  }

  // Step 1: Query lawyers by languages only using array-contains-any
  const tutorsSnapshot = await admin
    .firestore()
    .collection("testing")
    .doc("data")
    .collection("lawyers")
    .where("isOnline", "==", true)
    .where("languages", "array-contains-any", languages)
    .get();

  // Step 2: Filter in memory based on subjects and topics
  const matchingTutors: FirebaseFirestore.DocumentData[] = [];
  for (const lawyerDoc of tutorsSnapshot.docs) {
    const lawyerData = lawyerDoc.data();

    // Check if the lawyer's subjects array contains at least one of the desired subjects
    const matchesSubjects = subjects.some((subject) =>
      lawyerData.subjects.includes(subject)
    );

    // Check if the lawyer's topics array contains all specified topics
    const hasAllTopics = topics.every((topic) =>
      lawyerData.topics.includes(topic)
    );

    if (matchesSubjects && hasAllTopics) {
      matchingTutors.push({...lawyerData, lawyerID: lawyerDoc.id});
    }
  }

  return matchingTutors;
};

export const endSession = async (req: Request, res: Response) => {
  const {sessionID, lawyerID: tutorIDFromBody} = req.body;
  const userID =
    (req.user as { userID: string } | undefined)?.userID || tutorIDFromBody;

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

    if (sessionData?.status === "Completed") {
      return res.status(400).json({
        status: "fail",
        message: "Session has already been completed.",
      });
    }

    if (sessionData?.status === "Pending") {
      return res.status(400).json({
        status: "fail",
        message: "Session has not started yet.",
      });
    }

    if (sessionData?.status === "Expire") {
      return res.status(400).json({
        status: "fail",
        message: "Session has expired and cannot be completed.",
      });
    }

    if (sessionData?.status !== "In Progress") {
      return res.status(400).json({
        status: "fail",
        message: "Session is not in progress.",
      });
    }

    const {
      lawyerID,
      studentID,
      startTime,
      pausedIntervals = [],
    } = sessionData;

    const isTutorEnding = userID === lawyerID;
    const isStudentEnding = userID === studentID;

    // Ensure the user is either the lawyer or user in the session
    if (!isTutorEnding && !isStudentEnding) {
      return res.status(403).json({
        status: "fail",
        message: "Only the assigned lawyer or user can end this session.",
      });
    }

    const endTime = Date.now();
    const startTimeMillis = startTime.toDate().getTime();

    // Calculate total paused time
    const totalPausedTime = pausedIntervals.reduce(
      (total: number, interval: { start: number; end?: number }) => {
        if (interval.start && interval.end) {
          return total + (interval.end - interval.start);
        }
        return total;
      },
      0
    );

    // Calculate session duration excluding paused time
    const activeDurationMillis = endTime - startTimeMillis - totalPausedTime;
    let activeDurationSeconds = Math.floor(activeDurationMillis / 1000);

    // If duration is less than 2 minutes, count it as 2 minutes (120 seconds)
    activeDurationSeconds = Math.max(activeDurationSeconds, 120);

    const hours = Math.floor(activeDurationSeconds / 3600)
      .toString()
      .padStart(2, "0");
    const minutes = Math.floor((activeDurationSeconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (activeDurationSeconds % 60).toString().padStart(2, "0");
    const sessionTime = `${hours}:${minutes}:${seconds}`;

    const costPerMinute = 0.2; // Cost in dollars
    const minimumServiceFee = 0.1; // Fixed platform fee in dollars
    const totalMinutes = Math.ceil(activeDurationSeconds / 60);
    const costs = parseFloat((totalMinutes * costPerMinute).toFixed(2));
    const sessionEarning = parseFloat((costs - minimumServiceFee).toFixed(2));

    await sessionRef.update({
      status: "Completed",
      endTime: admin.firestore.Timestamp.fromMillis(endTime),
      costs, // Cost charged to user
      sessionTime, // Duration in hh:mm:ss format
      sessionEarning, // lawyer's earning after platform fee deduction
    });

    const userRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("users")
      .doc(studentID);
    await userRef.update({
      balance: admin.firestore.FieldValue.increment(-costs),
    });

    const lawyerRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("lawyers")
      .doc(lawyerID);
    await lawyerRef.update({
      balance: admin.firestore.FieldValue.increment(sessionEarning),
    });

    // Retrieve FCM token for notification
    if (isTutorEnding) {
      const userDoc = await userRef.get();
      const userData = userDoc.data();
      if (userData?.fcmToken) {
        await sendEndSessionNotificationToStudent(
          userData.fcmToken,
          sessionID,
          lawyerID,
          sessionTime,
          costs,
          sessionEarning,
          minimumServiceFee
        );
      }
    } else if (isStudentEnding) {
      const lawyerDoc = await lawyerRef.get();
      const lawyerData = lawyerDoc.data();
      if (lawyerData?.fcmToken) {
        await sendEndSessionNotificationToTutor(
          lawyerData.fcmToken,
          sessionID,
          studentID,
          sessionTime,
          costs,
          sessionEarning,
          minimumServiceFee
        );
      }
    }

    return res.status(200).json({
      status: "success",
      message: "Session ended",
      data: {
        sessionTime,
        costs, // Total cost in dollars
        sessionEarning, // lawyer's earnings after platform fee
        platformFee: minimumServiceFee, // Platform fee taken from lawyer's earnings
      },
    });
  } catch (error) {
    console.error("Error in endSession:", error);
    return res.status(500).json({
      status: "fail",
      message: error instanceof Error ? error.message : "Failed to end session",
    });
  }
};

export const acceptSession = async (req: Request, res: Response) => {
  const {searchID, lawyerID} = req.body;

  try {
    const searchRef = admin.firestore().collection("sessionTmp").doc(searchID);
    const searchDoc = await searchRef.get();

    if (!searchDoc.exists || !searchDoc.data()) {
      return res.status(404).json({
        status: "fail",
        message: "Search not found.",
      });
    }

    const searchData = searchDoc.data() as {
      studentID: string;
      languages: string;
      subjects: string | string[];
      topics: string[] | undefined;
      createdAt: FirebaseFirestore.Timestamp;
    };

    const {
      studentID,
      languages,
      subjects,
      topics = [],
      createdAt,
    } = searchData;

    // Move session data to sessions collection
    const sessionRef = admin.firestore().collection("sessions").doc();
    await sessionRef.set(
      {
        studentID,
        lawyerID,
        languages,
        subjects,
        topics: topics || [], // Set an empty array if topics is undefined
        status: "In Progress",
        createdAt: createdAt, // Use the original createdAt from sessionTmp
        startTime: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true} // Ensure undefined properties do not interfere
    );

    // Delete the search document in sessionTmp
    await searchRef.delete();

    // Send FCM notification to the user
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
        sessionRef.id,
        lawyerID
      );
    }

    return res.status(200).json({
      status: "success",
      message: "Session started and notification sent",
      data: {
        sessionID: sessionRef.id,
      },
    });
  } catch (error) {
    console.error("Error in acceptSession:", error);
    return res.status(500).json({
      status: "fail",
      message:
        error instanceof Error ? error.message : "Failed to accept session",
    });
  }
};

// Reject session and add lawyer to rejectedTutors list
export const rejectSession = async (req: Request, res: Response) => {
  const {searchID, lawyerID} = req.body;

  try {
    const searchRef = admin.firestore().collection("sessionTmp").doc(searchID);
    const searchDoc = await searchRef.get();

    if (!searchDoc.exists) {
      return res.status(404).json({
        status: "fail",
        message: "Search not found.",
      });
    }

    const searchData = searchDoc.data();
    const rejectedTutors = searchData?.rejectedTutors || [];

    // Check if lawyer is already rejected to avoid duplication
    if (!rejectedTutors.includes(lawyerID)) {
      rejectedTutors.push(lawyerID);
    }

    // Update Firestore document with updated rejectedTutors list
    await searchRef.update({
      rejectedTutors,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      status: "success",
      message: "lawyer rejected and status updated",
    });
  } catch (error) {
    console.error("Error in rejectSession:", error);
    return res.status(500).json({
      status: "fail",
      message:
        error instanceof Error ? error.message : "Failed to reject session",
    });
  }
};

// Controller for generating multiple signed URLs with sessionID in path
export const generateSignedUploadUrls = async (req: Request, res: Response) => {
  const {files, sessionID} = req.body; // Array of filenames and sessionID

  if (!sessionID || typeof sessionID !== "string") {
    return res.status(400).json({
      status: "fail",
      message: "sessionID is required and must be a string.",
    });
  }

  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({
      status: "fail",
      message: "Files must be an array of filenames.",
    });
  }

  try {
    // Validate filenames
    const invalidFiles = files.filter(
      (file) => typeof file !== "string" || file.trim() === ""
    );
    if (invalidFiles.length > 0) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid file names detected.",
      });
    }

    // Generate signed URLs for files within the session's folder
    const signedUrls = await Promise.all(
      files.map((fileName) =>
        generateSignedUrlWrite(`sessions/${sessionID}/${fileName}`)
      )
    );

    return res.status(200).json({
      status: "success",
      message: "Signed URLs generated.",
      data: signedUrls,
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error generating signed URLs:", error.message);
      return res.status(500).json({
        status: "fail",
        message: error.message || "Failed to generate signed URLs.",
      });
    }
    console.error("Unexpected error:", error);
    return res.status(500).json({
      status: "fail",
      message: "An unexpected error occurred.",
    });
  }
};

// Save File URLs to Firestore
export const saveFileUrls = async (req: Request, res: Response) => {
  const {sessionID, fileUrls} = req.body;

  // Validate inputs
  if (!sessionID || typeof sessionID !== "string") {
    return res.status(400).json({
      status: "fail",
      message: "sessionID is required and must be a string.",
    });
  }

  if (!Array.isArray(fileUrls) || fileUrls.length === 0) {
    return res.status(400).json({
      status: "fail",
      message: "fileUrls must be a non-empty array.",
    });
  }

  try {
    const sessionRef = admin.firestore().collection("sessions").doc(sessionID);

    // Check if the session exists
    const sessionDoc = await sessionRef.get();
    if (!sessionDoc.exists) {
      return res.status(404).json({
        status: "fail",
        message: "Session not found.",
      });
    }

    // Save the URLs to Firestore
    // Generate the full URLs
    const fullUrls = fileUrls.map(
      (fileName) =>
        `https://storage.googleapis.com/studyotutorapp.appspot.com/sessions/${sessionID}/${fileName}`
    );

    // Save the URLs to Firestore
    await sessionRef.update({
      fileUrls: admin.firestore.FieldValue.arrayUnion(...fullUrls),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Make each file public
    const publicFileTasks = fileUrls.map((fileName) =>
      makeFilePublic(`sessions/${sessionID}/${fileName}`)
    );
    await Promise.all(publicFileTasks);

    return res.status(200).json({
      status: "success",
      message: "File URLs saved successfully.",
      data: {
        fileUrls: fullUrls, // Include the saved URLs in the response
      },
    });
  } catch (error) {
    console.error("Error saving file URLs:", error);
    return res.status(500).json({
      status: "fail",
      message:
        error instanceof Error ? error.message : "Failed to save file URLs.",
    });
  }
};

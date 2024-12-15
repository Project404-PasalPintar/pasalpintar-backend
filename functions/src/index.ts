import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import authRoutes from "./routes/users/authRoutes";
import userRoutes from "./routes/users/userRoutes";
import profileRoutes from "./routes/users/uploadProfileRoutes";
import usernameRoutes from "./routes/users/usernameRoutes";
import passwordRoutes from "./routes/users/passwordRoutes";
import getLawyer from "./routes/lawyers/getLawyer";

// Session
import sessionInfoRoutes from "./routes/sessions/sessionInfoRoutes";
import sessionRoutes from "./routes/sessions/sessionRoutes";

// lawyers
import lawyerAuthRoutes from "./routes/lawyers/authRoutes";
import lawyerRoutes from "./routes/lawyers/lawyerRoutes";
import lawyerProfileRoutes from "./routes/lawyers/uploadProfileRoutes";
import lawyersUsernameRoutes from "./routes/lawyers/usernameRoutes";
import lawyerPasswordRoutes from "./routes/lawyers/passwordRoutes";

// chat
import communitasRoutes from "./routes/communitas/communitasRoutes";
import chatRoutes from "./routes/communitas/chatRoutes";
import aiChatRoutes from "./routes/communitas/aiChatRoutes";

import serviceAccount from "./utils/service-account-key.json";

dotenv.config();

const storageBucket = process.env.STORAGE_BUCKET;

// Extend IncomingMessage to include userID
declare module "http" {
  interface IncomingMessage {
    userID?: string;
  }
}

// Initialize Firebase Admin SDK
if (process.env.FUNCTIONS_EMULATOR === "true") {
  console.log("Running in Emulator mode");
  admin.initializeApp({
    projectId: "studyotutorapp",
    storageBucket,
  });
} else {
  console.log("Running in Production mode");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    storageBucket,
  });
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors({origin: true}));

// ----------- lawyers ------------
app.use("/v1/users/auth", authRoutes);
app.use("/v1/users/profile", userRoutes);
app.use("/v1/users/profile/lawyer", getLawyer);
app.use("/v1/users/profile/file", profileRoutes);
app.use("/v1/users/profile/username", usernameRoutes);
app.use("/v1/users/profile/password", passwordRoutes);

// ----------- session ------------
app.use("/v1/sessions", sessionRoutes);
app.use("/v1/sessions/info", sessionInfoRoutes);

app.use("/v1/lawyers/auth", lawyerAuthRoutes);
app.use("/v1/lawyers/profile", lawyerRoutes);
app.use("/v1/lawyers/profile/file", lawyerProfileRoutes);
app.use("/v1/lawyers/profile/username", lawyersUsernameRoutes);
app.use("/v1/lawyers/profile/password", lawyerPasswordRoutes);

app.use("/v1/communitas", communitasRoutes);
app.use("/v1/chat", chatRoutes);
app.use("/v1/ai", aiChatRoutes);

functions.logger.info("Server is running");

// Export the API as a Firebase Cloud Function
exports.test = functions.https.onRequest(app);

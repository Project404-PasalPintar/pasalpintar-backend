// src/controllers/generateTokenController.ts
import {RtcTokenBuilder, RtcRole} from "agora-access-token";
import * as dotenv from "dotenv";

dotenv.config();

const AGORA_APP_ID = process.env.AGORA_APP_ID || "";
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || "";

if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
  throw new Error(
    "Agora credentials are not defined in environment variables."
  );
}

// Helper function to generate Agora token and channel name with unique uids for user and lawyer
export const generateAgoraTokensAndChannel = (
  studentID: string,
  lawyerID: string
) => {
  const epochTimestamp = Date.now().toString();
  const channelName = `session_${studentID.slice(0, 5)}_${lawyerID.slice(
    0,
    5
  )}_${epochTimestamp.slice(-6)}`;

  // Generate unique uids for each participant
  const studentUid = Math.floor(Math.random() * 100000) + 1;
  const tutorUid = Math.floor(Math.random() * 100000) + 1;

  const role = RtcRole.PUBLISHER;
  const expirationTimeInSeconds = 3600; // 1 hour
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  // Generate RTC tokens for both user and lawyer
  const agoraRtcTokenStudent = RtcTokenBuilder.buildTokenWithUid(
    AGORA_APP_ID,
    AGORA_APP_CERTIFICATE,
    channelName,
    studentUid,
    role,
    privilegeExpiredTs
  );

  const agoraRtcTokenTutor = RtcTokenBuilder.buildTokenWithUid(
    AGORA_APP_ID,
    AGORA_APP_CERTIFICATE,
    channelName,
    tutorUid,
    role,
    privilegeExpiredTs
  );

  return {
    agoraRtcTokenStudent,
    agoraRtcTokenTutor,
    channelName,
    studentUid,
    tutorUid,
  };
};

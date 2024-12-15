// src/routes/sessionRoutes.ts
/* eslint-disable new-cap */
import {Router} from "express";
import {
  startSession,
  endSession,
  acceptSession,
  rejectSession,
  createRandomTutorSearch,
  generateSignedUploadUrls,
  saveFileUrls,
} from "../../controllers/sessions/sessionController";
import {
  leaveSession,
  rejoinSession,
} from "../../controllers/sessions/meetingController";
import {verifyAccessToken} from "../../middleware/users/authMiddleware";
import {checkStudentBalance} from "../../middleware/sessions/checkBalanceMiddleware";
import {getTutorSessionHistory} from "../../controllers/sessions/sessionHistoryController";
import {getTutorStatistics} from "../../controllers/sessions/tutorStatisticsController";
import {getMonthlySummary} from "../../controllers/sessions/sessionSummaryController";

const router = Router(); // Router is an exception to new-cap rule

// Protect routes with verifyAccessToken
router.post("/start", verifyAccessToken, checkStudentBalance, startSession);
router.post("/upload-urls", verifyAccessToken, generateSignedUploadUrls);
router.post("/save-file-urls", verifyAccessToken, saveFileUrls);

router.post("/end", verifyAccessToken, endSession);

router.get(
  "/session-history/:lawyerID",
  verifyAccessToken,
  getTutorSessionHistory
);

router.post(
  "/start/lawyer-random",
  verifyAccessToken,
  checkStudentBalance,
  createRandomTutorSearch
);
router.post("/start/yes", verifyAccessToken, acceptSession);
router.post("/start/no", verifyAccessToken, rejectSession);

// src/routes/sessionRoutes.ts
router.post("/leave", verifyAccessToken, leaveSession);
router.post("/rejoin", verifyAccessToken, rejoinSession);

router.get("/statistics/:lawyerID", verifyAccessToken, getTutorStatistics);

router.get("/summary/:lawyerID", verifyAccessToken, getMonthlySummary);

export default router;
/* eslint-enable new-cap */

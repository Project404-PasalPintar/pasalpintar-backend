// src/middleware/sessions/checkBalanceMiddleware.ts
import {Request, Response, NextFunction} from "express";
import * as admin from "firebase-admin";

export const checkStudentBalance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userID = (req.user as { id: string }).id;

  try {
    const studentDocRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("users")
      .doc(userID);
    const userDoc = await studentDocRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({
        status: "fail",
        message: "user not found.",
      });
    }

    const userData = userDoc.data();
    const studentBalance = userData?.balance || 0;
    const serviceCostPerMinute = 5; // Cost per minute
    const minimumBalanceRequired = serviceCostPerMinute + 10; // Buffer for service fees

    if (studentBalance < minimumBalanceRequired) {
      return res.status(402).json({
        status: "fail",
        message: "Insufficient balance.",
      });
    }

    // Proceed to the next middleware/handler if balance is sufficient
    return next();
  } catch (error) {
    console.error("Error checking user balance:", error);
    return res.status(500).json({
      status: "fail",
      message: "Unable to check user balance.",
    });
  }
};

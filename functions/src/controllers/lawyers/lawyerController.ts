// src/controllers/lawyers/tutorController.ts
import {Request, Response} from "express";
import * as admin from "firebase-admin";
import {getStorage} from "firebase-admin/storage";
import deleteCollectionRecursively from "../../utils/deleteCollectionRecursively";

// get all lawyers
export const getAllTutors = async (req: Request, res: Response) => {
  try {
    // Default limit to 3 lawyers
    const limit = parseInt(req.query.limit as string) || 2;

    const lawyersRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("lawyers")
      .limit(limit);
    const snapshot = await lawyersRef.get();

    if (snapshot.empty) {
      return res.status(404).json({
        status: "fail",
        message: "No lawyers found.",
      });
    }

    const lawyers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ?
        doc.data().createdAt.toDate().toISOString() :
        null,
      updatedAt: doc.data().updatedAt ?
        doc.data().updatedAt.toDate().toISOString() :
        null,
    }));

    return res.status(200).json({
      status: "success",
      message: "lawyers retrieved successfully",
      data: lawyers,
    });
  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message: error instanceof Error ? error.message : "Failed to get lawyers",
    });
  }
};

// Get lawyer data
export const getLawyerProfile = async (req: Request, res: Response) => {
  const lawyerID = (req.user as { userID: string }).userID;

  try {
    const lawyerRef = admin
      .firestore()
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

    const createdAt = lawyerData?.createdAt ?
      lawyerData.createdAt.toDate().toISOString() :
      null;
    const updatedAt = lawyerData?.updatedAt ?
      lawyerData.updatedAt.toDate().toISOString() :
      null;

    return res.status(200).json({
      status: "success",
      message: "lawyer profile retrieved successfully",
      data: {
        ...lawyerData,
        createdAt,
        updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message:
        error instanceof Error ? error.message : "Failed to get lawyer profile",
    });
  }
};

// Update lawyer data with PUT (replace entire document)
export const updateTutorProfilePut = async (req: Request, res: Response) => {
  const lawyerID = (req.user as { userID: string }).userID;
  const newTutorData = req.body;

  try {
    const lawyerRef = admin
      .firestore()
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

    // Preserve createdAt, but update updatedAt
    const existingTutorData = lawyerDoc.data();
    const createdAt =
      existingTutorData?.createdAt ||
      admin.firestore.FieldValue.serverTimestamp();
    const updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await lawyerRef.set(
      {
        ...newTutorData,
        createdAt, // Do not change createdAt
        updatedAt, // Always update updatedAt
      },
      {merge: false}
    ); // Replace the document except createdAt

    return res.status(200).json({
      status: "success",
      message: "lawyer profile updated successfully",
      data: {
        lawyerID: lawyerID,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message:
        error instanceof Error ?
          error.message :
          "Failed to update lawyer profile",
    });
  }
};

// Partially update lawyer data with PATCH
export const updateTutorProfilePatch = async (req: Request, res: Response) => {
  const lawyerID = (req.user as { userID: string }).userID;
  const updateData = req.body;

  try {
    const lawyerRef = admin
      .firestore()
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

    // Always update the updatedAt field
    const updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await lawyerRef.update({
      ...updateData,
      updatedAt, // Always update updatedAt when updating data
    });

    return res.status(200).json({
      status: "success",
      message: "lawyer profile partially updated",
      data: {
        lawyerID: lawyerID,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message:
        error instanceof Error ?
          error.message :
          "Failed to update lawyer profile",
    });
  }
};

// Delete lawyer profile
export const deleteTutorProfile = async (req: Request, res: Response) => {
  const lawyerID = (req.user as { userID: string }).userID;

  try {
    const lawyerRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("lawyers")
      .doc(lawyerID);

    // Hapus subcollection 'userData' secara rekursif
    await deleteCollectionRecursively(lawyerRef);

    // Hapus folder lawyer di Cloud Storage
    const bucket = getStorage().bucket();
    const folderPath = `testing/${lawyerID}/`;
    await bucket.deleteFiles({
      prefix: folderPath,
    });

    // Hapus akun lawyer dari Firebase Authentication
    await admin.auth().deleteUser(lawyerID);

    await lawyerRef.delete();
    return res.status(200).json({
      status: "success",
      message: "lawyer profile deleted",
    });
  } catch (error) {
    return res.status(500).json({
      status: "fail",
      message:
        error instanceof Error ?
          error.message :
          "Failed to delete lawyer profile",
    });
  }
};

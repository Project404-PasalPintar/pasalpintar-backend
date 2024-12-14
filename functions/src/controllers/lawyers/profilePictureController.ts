import {Request, Response} from "express";
import * as admin from "firebase-admin";
import {makeFilePublic} from "../../helpers/users/makeFilePublic";
import {generateSignedUrlWrite} from "../../helpers/users/generateSignedUrl";
import {deleteFileFromStorage} from "../../helpers/users/deleteFileFromStorage";

// Controller to handle signed URL generation for profile pictures
export const generateProfilePicUploadUrl = async (
  req: Request,
  res: Response
) => {
  const userID = (req.user as { userID: string }).userID;
  const {fileName} = req.body;

  if (!fileName || typeof fileName !== "string") {
    return res.status(400).json({
      status: "fail",
      message: "fileName is required and must be a string.",
    });
  }

  try {
    const filePath = `testing/${userID}/${fileName}`;
    const signedUrl = await generateSignedUrlWrite(filePath);

    return res.status(200).json({
      status: "success",
      message: "Signed URL generated for profile picture upload.",
      data: {signedUrl},
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(
        "Error generating profile picture signed URL:",
        error.message
      );
      return res.status(500).json({
        status: "fail",
        message: error.message || "Failed to generate signed URL.",
      });
    }
    console.error("Unexpected error:", error);
    return res.status(500).json({
      status: "fail",
      message: "An unexpected error occurred.",
    });
  }
};

// Controller to save profile picture URL
export const saveProfilePicUrl = async (req: Request, res: Response) => {
  const userID = (req.user as { userID: string }).userID;
  const {fileName} = req.body;

  if (!fileName || typeof fileName !== "string") {
    return res.status(400).json({
      status: "fail",
      message: "fileName is required and must be a string.",
    });
  }

  try {
    // Construct the full URL for the profile picture
    const profilePicUrl = `https://storage.googleapis.com/studyotutorapp.appspot.com/lawyers/${userID}/${fileName}`;

    // Make file public
    await makeFilePublic(`testing/${userID}/${fileName}`);

    // Reference to Firestore document
    const profileDocRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("lawyers")
      .doc(userID);

    // Update the profilePic field in Firestore
    await profileDocRef.set(
      {profilePic: profilePicUrl},
      {merge: true} // Use merge to avoid overwriting other fields
    );

    return res.status(200).json({
      status: "success",
      message: "Profile picture URL saved successfully.",
      data: {profilePic: profilePicUrl},
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error saving profile picture URL:", error.message);
      return res.status(500).json({
        status: "fail",
        message: error.message || "Failed to save profile picture URL.",
      });
    }
    console.error("Unexpected error:", error);
    return res.status(500).json({
      status: "fail",
      message: "An unexpected error occurred.",
    });
  }
};

export const deleteProfilePic = async (req: Request, res: Response) => {
  const userID = (req.user as { userID: string }).userID;

  try {
    // Reference to Firestore document
    const profileDocRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("lawyers")
      .doc(userID);

    // Get the current profile picture URL from Firestore
    const profileDoc = await profileDocRef.get();
    if (!profileDoc.exists) {
      return res.status(404).json({
        status: "fail",
        message: "Profile data not found.",
      });
    }

    const profileData = profileDoc.data();
    const profilePicUrl = profileData?.profilePic;

    if (!profilePicUrl) {
      return res.status(400).json({
        status: "fail",
        message: "No profile picture found to delete.",
      });
    }

    // Extract the file path from the URL
    const filePath = profilePicUrl.replace(
      "https://storage.googleapis.com/studyotutorapp.appspot.com/",
      ""
    );

    await deleteFileFromStorage(filePath);

    // Remove the profilePic field from Firestore
    await profileDocRef.update({
      profilePic: admin.firestore.FieldValue.delete(),
    });

    return res.status(200).json({
      status: "success",
      message: "Profile picture deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting profile picture:", error);
    return res.status(500).json({
      status: "fail",
      message:
        error instanceof Error ?
          error.message :
          "Failed to delete profile picture.",
    });
  }
};

import * as admin from "firebase-admin";

export const makeFilePrivate = async (filePath: string): Promise<void> => {
  try {
    const bucket = admin.storage().bucket();
    const file = bucket.file(filePath);

    // Set the file to private
    await file.makePrivate();
    console.log(`File ${filePath} is now private.`);
  } catch (error) {
    console.error("Error making file private:", error);
    throw new Error("Failed to make file private.");
  }
};

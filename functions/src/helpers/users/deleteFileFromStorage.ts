import * as admin from "firebase-admin";

// Helper function to delete file from Cloud Storage
export const deleteFileFromStorage = async (filePath: string) => {
  const bucket = admin.storage().bucket();
  const file = bucket.file(filePath);

  try {
    await file.delete();
    console.log(`Successfully deleted file: ${filePath}`);
  } catch (error) {
    console.error(`Failed to delete file: ${filePath}`, error);
    throw new Error(`Failed to delete file: ${filePath}`);
  }
};

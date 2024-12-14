import * as admin from "firebase-admin";

export const makeFilePublic = async (filePath: string): Promise<void> => {
  try {
    const bucket = admin.storage().bucket();
    const file = bucket.file(filePath);

    // Check if the file exists
    const [exists] = await file.exists();

    if (!exists) {
      console.warn(`File ${filePath} does not exist.`);
      throw new Error(`File ${filePath} does not exist.`);
    }

    // Set file to public
    await file.makePublic();
    console.log(`File ${filePath} is now public.`);
  } catch (error) {
    console.error("Error making file public:", error);
    throw new Error("Failed to make file public.");
  }
};

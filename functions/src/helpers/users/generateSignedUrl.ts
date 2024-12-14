import * as admin from "firebase-admin";
import {lookup as getType} from "mime-types"; // Gunakan `lookup` dari mime-types

export const generateSignedUrlWrite = async (
  filePath: string,
  expiresInMinutes = 15
): Promise<string> => {
  try {
    const bucket = admin.storage().bucket();
    const file = bucket.file(filePath);

    // Determine the content type based on file extension
    const contentType = getType(filePath) || "application/octet-stream";

    // Generate Signed URL
    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + expiresInMinutes * 60 * 1000,
      contentType,
    });

    return url;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error generating signed URL:", error.message);
      throw new Error("Failed to generate signed URL.");
    }
    console.error("Unexpected error:", error);
    throw new Error(
      "An unexpected error occurred while generating the signed URL."
    );
  }
};

export const generateSignedUrlRead = async (
  filePath: string
): Promise<string> => {
  try {
    const bucket = admin.storage().bucket();
    const file = bucket.file(filePath);

    // Determine the content type based on the file extension
    const contentType = getType(filePath) || "application/octet-stream";

    // Generate Signed URL for reading
    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days expiration
      contentType,
    });

    return url;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error generating signed URL for read:", error.message);
      throw new Error("Failed to generate signed URL for reading.");
    }
    console.error("Unexpected error:", error);
    throw new Error(
      "An unexpected error occurred while generating the signed URL for reading."
    );
  }
};

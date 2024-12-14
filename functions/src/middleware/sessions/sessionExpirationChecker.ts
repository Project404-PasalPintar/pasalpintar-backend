import * as admin from "firebase-admin";

export const checkSessionExpiration = async () => {
  const now = admin.firestore.Timestamp.now();

  const sessionsSnapshot = await admin
    .firestore()
    .collection("sessions")
    .where("startTime", "<=", now.toMillis() - 60 * 1000) // Menggunakan toMillis() untuk mendapatkan timestamp dalam milidetik
    .where("status", "==", "Pending")
    .get();

  // Update status session yang expire
  const batch = admin.firestore().batch();
  sessionsSnapshot.forEach((doc) => {
    batch.update(doc.ref, {status: "Expire"});
  });

  await batch.commit();
};

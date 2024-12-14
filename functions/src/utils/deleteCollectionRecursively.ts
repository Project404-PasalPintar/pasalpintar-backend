/**
 * Utility function to recursively delete subcollections in Firestore.
 *
 * @param {FirebaseFirestore.DocumentReference} docRef - The Firestore document reference to delete subcollections from.
 * @param {number} [batchSize=10] - The size of the batch for Firestore deletion operations (default is 10).
 */
async function deleteCollectionRecursively(
  docRef: FirebaseFirestore.DocumentReference,
  batchSize = 10
) {
  const subCollections = await docRef.listCollections();

  for (const collection of subCollections) {
    const query = collection.limit(batchSize);
    let snapshot = await query.get();

    // Loop through the collection and delete documents in batches
    while (!snapshot.empty) {
      const batch = docRef.firestore.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      // Get the next batch of documents
      snapshot = await query.get();
    }

    // Recursively delete subcollections within documents
    for (const doc of snapshot.docs) {
      await deleteCollectionRecursively(doc.ref, batchSize);
    }
  }
}

export default deleteCollectionRecursively;

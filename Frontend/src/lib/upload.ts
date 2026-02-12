import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, auth } from "./firebase";

/**
 * Upload an image file to Firebase Storage and return the download URL.
 * Generates a unique filename using timestamp + user UID.
 */
export async function uploadImage(file: File): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User must be authenticated to upload images");
  }

  const timestamp = Date.now();
  const uniqueName = `reports/${user.uid}_${timestamp}_${file.name}`;
  const storageRef = ref(storage, uniqueName);

  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);

  return downloadURL;
}

import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserSessionPersistence } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Use session-scoped persistence so that auth state is NOT carried over
// across browser restarts via IndexedDB. Without this, a cached admin
// session stored in IndexedDB lets anyone who opens the browser tab again
// navigate directly to /dashboard/admin (or any role-gated route) without
// re-authenticating. browserSessionPersistence stores the token in
// sessionStorage, which is cleared when the tab/window is closed.
setPersistence(auth, browserSessionPersistence).catch((err) => {
  // Non-fatal: log the error but don't crash the app.
  // The auth flow will still work; persistence will fall back to the default.
  console.error("[Firebase] Failed to set session persistence:", err);
});

// Initialize Firebase Storage
export const storage = getStorage(app);

export default app;

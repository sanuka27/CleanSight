/**
 * Maps Firebase Auth error codes to user-friendly messages.
 * Reused by both Google and Facebook sign-in flows on Login + Signup pages.
 */

const FIREBASE_AUTH_ERROR_MAP: Record<string, string> = {
  // Popup / redirect errors
  "auth/popup-closed-by-user": "Sign-in cancelled.",
  "auth/cancelled-popup-request": "Sign-in cancelled.",
  "auth/popup-blocked":
    "Popup blocked by your browser. Please allow popups for this site.",

  // Provider / credential errors
  "auth/account-exists-with-different-credential":
    "This email is already registered with another provider. Please sign in using the original method.",
  "auth/credential-already-in-use":
    "This credential is already linked to a different account.",

  // Email / password errors
  "auth/invalid-credential": "Invalid email or password.",
  "auth/user-not-found": "No account found with this email.",
  "auth/wrong-password": "Incorrect password.",
  "auth/email-already-in-use": "This email is already registered.",
  "auth/weak-password": "Password should be at least 6 characters.",
  "auth/invalid-email": "Please enter a valid email address.",

  // Network / availability
  "auth/network-request-failed": "Network error. Please check your connection and try again.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/internal-error": "An internal error occurred. Please try again.",

  // Provider not enabled in Firebase console
  "auth/operation-not-allowed":
    "This sign-in method is not enabled. Please contact support or enable the provider in Firebase Console.",
};

/**
 * Convert a Firebase Auth error into a human-readable message.
 *
 * @param error   The caught error (usually has `.code` and `.message`).
 * @param context Optional label like "Google" or "Facebook" for the fallback message.
 */
export function mapFirebaseAuthErrorToMessage(
  error: unknown,
  context = "Sign-in",
): string {
  const firebaseError = error as { code?: string; message?: string };
  const code = firebaseError.code ?? "";

  // Known error code → friendly message
  if (code && FIREBASE_AUTH_ERROR_MAP[code]) {
    return FIREBASE_AUTH_ERROR_MAP[code];
  }

  // Dev safety: surface the raw code so developers can add it to the map
  if (code) {
    console.warn(`[authErrors] Unmapped Firebase error code: ${code}`);
  }

  return `${context} failed. Please try again.`;
}

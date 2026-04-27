import { api, ApiError } from "@/lib/api";
import type { AppUser } from "@/context/AuthContextShared";
import type { User as FirebaseUser } from "firebase/auth";

/**
 * Thin service layer over the backend user profile endpoints.
 *
 * All functions require the Firebase user to be signed-in so that the
 * `api` client can attach the ID token automatically.
 */

/**
 * Fetch the current user's backend profile.
 * Returns `null` when the profile does not exist yet (404).
 */
export async function getUserProfile(): Promise<AppUser | null> {
  try {
    const res = await api.getMe();
    if (res.success && res.data?.user) {
      return res.data.user as AppUser;
    }
    return null;
  } catch (err: unknown) {
    // Detect 404 via status code — profile doesn't exist yet
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/**
 * Create a brand-new backend profile for the authenticated user.
 * Wraps `api.register()` and returns the created `AppUser`.
 */
export async function createUserProfile(payload: {
  name: string;
  email: string;
  role: string;
}): Promise<AppUser> {
  const res = await api.register(payload);
  if (res.success && res.data?.user) {
    return res.data.user as AppUser;
  }
  // Some backends return the user at the top level after register
  if (res.user) {
    return res.user as AppUser;
  }
  throw new Error("Unexpected response from register endpoint");
}

/**
 * Check whether the currently signed-in Firebase user already has a
 * backend profile.  Returns the profile when it exists, `null` otherwise.
 *
 * This intentionally does NOT create a profile so that the caller can
 * decide whether to redirect to onboarding.
 */
export async function ensureUserProfile(
  _firebaseUser: FirebaseUser,
): Promise<AppUser | null> {
  return getUserProfile();
}

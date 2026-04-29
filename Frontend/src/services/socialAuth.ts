/**
 * Social authentication helpers using Firebase Auth popup flow.
 *
 * Each function creates the appropriate provider, triggers signInWithPopup,
 * and returns the Firebase User on success. The caller is responsible for
 * the post-sign-in flow (profile check → onboarding or dashboard).
 */

import {
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export type SocialProvider = "google" | "facebook";

/**
 * Sign in with Google via popup.
 * Returns the Firebase user on success.
 */
export async function signInWithGoogle(): Promise<FirebaseUser> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

/**
 * Sign in with Facebook via popup.
 * Requests the `email` scope so we reliably receive the user's email.
 * Returns the Firebase user on success.
 */
export async function signInWithFacebook(): Promise<FirebaseUser> {
  const provider = new FacebookAuthProvider();
  provider.addScope("email");
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

/**
 * Generic dispatcher — pick the right provider by name.
 */
export async function signInWithSocial(providerType: SocialProvider): Promise<FirebaseUser> {
  switch (providerType) {
    case "google":
      return signInWithGoogle();
    case "facebook":
      return signInWithFacebook();
    default:
      throw new Error(`Unknown social provider: ${providerType}`);
  }
}

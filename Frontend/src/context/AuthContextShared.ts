import { createContext } from "react";
import type { User } from "firebase/auth";
import type { AppRole } from "@/lib/role";

/** Backend user profile from /api/auth/me */
export interface AppUser {
  id: string;
  firebaseUid: string;
  name: string;
  email: string;
  role: AppRole;
  avatar: string | null;
  phone: string | null;
  isVerified: boolean;
  reportsSubmitted: number;
  cleanupsCompleted: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAppUserLoading: boolean;
  appUserError: string | null;
  /** True when authenticated but no backend profile exists yet (needs onboarding). */
  needsOnboarding: boolean;
  /** Set when a forced logout is triggered by account suspension. */
  suspendedMessage: string | null;
  logout: () => Promise<void>;
  refreshAppUser: () => Promise<void>;
  /**
   * Call BEFORE a Firebase sign-in / sign-up method so that the concurrent
   * onAuthStateChanged -> fetchAppUser flow does not auto-sign-out the user
   * when /me returns 404 (profile not yet created).
   */
  markSigningIn: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
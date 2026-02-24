import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { 
  User, 
  onAuthStateChanged, 
  signOut as firebaseSignOut 
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { api, ApiError } from "@/lib/api";
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

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAppUserLoading: boolean;
  appUserError: string | null;
  /** True when authenticated but no backend profile exists yet (needs onboarding). */
  needsOnboarding: boolean;
  logout: () => Promise<void>;
  refreshAppUser: () => Promise<void>;
  /**
   * Call BEFORE a Firebase sign-in / sign-up method so that the concurrent
   * onAuthStateChanged → fetchAppUser flow does not auto-sign-out the user
   * when /me returns 404 (profile not yet created).
   */
  markSigningIn: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAppUserLoading, setIsAppUserLoading] = useState(false);
  const [appUserError, setAppUserError] = useState<string | null>(null);

  /**
   * When true, a sign-in / sign-up handler is actively running.
   * Prevents fetchAppUser from auto-signing-out on 404 during the
   * brief window between Firebase auth and backend profile creation.
   */
  const signingInRef = useRef(false);

  const markSigningIn = useCallback(() => {
    signingInRef.current = true;
    // Safety: auto-clear after 60 s so a crashed flow can't leave the flag stuck.
    setTimeout(() => { signingInRef.current = false; }, 60_000);
  }, []);

  /** Fetch backend profile from /api/auth/me */
  const fetchAppUser = useCallback(async () => {
    setIsAppUserLoading(true);
    setAppUserError(null);
    try {
      const res = await api.getMe();
      if (res.success && res.data?.user) {
        setAppUser(res.data.user as AppUser);
        // Profile found — any in-progress sign-in flow is complete.
        signingInRef.current = false;
      } else {
        // Profile not found — user may not have completed registration yet.
        // This is normal during signup (register hasn't been called yet).
        setAppUser(null);
      }
    } catch (err: unknown) {
      // 404 means the backend has no profile for this Firebase user.
      if (err instanceof ApiError && err.status === 404) {
        if (signingInRef.current) {
          // A sign-in handler is running (Google onboarding / email signup)
          // — keep the Firebase session so the user can finish onboarding.
          setAppUser(null);
        } else {
          // No active sign-in → stale Firebase session whose backend
          // profile was deleted.  Sign out to return to guest mode.
          setAppUser(null);
          await firebaseSignOut(auth);
        }
      } else {
        const message = err instanceof Error ? err.message : "Failed to fetch profile";
        console.error("Failed to fetch app user:", message);
        setAppUserError(message);
        setAppUser(null);
      }
    } finally {
      setIsAppUserLoading(false);
    }
  }, []);

  /** Public method to re-fetch the backend profile */
  const refreshAppUser = useCallback(async () => {
    if (auth.currentUser) {
      await fetchAppUser();
    }
  }, [fetchAppUser]);

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Firebase user is ready — hydrate backend profile (role comes from DB)
        await fetchAppUser();
      } else {
        // Signed out — clear backend profile
        setAppUser(null);
        setAppUserError(null);
      }
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [fetchAppUser]);

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setAppUser(null);
      setAppUserError(null);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  // User is authenticated but has no backend profile → needs role onboarding.
  // Only flag this after both loading phases have completed to avoid flicker.
  const needsOnboarding = !!user && !isLoading && !isAppUserLoading && appUser === null;

  const value: AuthContextType = {
    user,
    appUser,
    isAuthenticated: !!user,
    isLoading,
    isAppUserLoading,
    appUserError,
    needsOnboarding,
    logout,
    refreshAppUser,
    markSigningIn,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { 
  User, 
  onAuthStateChanged, 
  signOut as firebaseSignOut 
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { api } from "@/lib/api";
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

  /** Fetch backend profile from /api/auth/me */
  const fetchAppUser = useCallback(async () => {
    setIsAppUserLoading(true);
    setAppUserError(null);
    try {
      const res = await api.getMe();
      if (res.success && res.data?.user) {
        setAppUser(res.data.user as AppUser);
      } else {
        // Profile not found — user may not have completed registration yet.
        // This is normal during signup (register hasn't been called yet).
        setAppUser(null);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch profile";
      // 404 "User profile not found" is expected during signup before register()
      // completes. Only set error for unexpected failures.
      const is404 = message.toLowerCase().includes("not found") ||
                     message.toLowerCase().includes("complete registration");
      if (!is404) {
        console.error("Failed to fetch app user:", message);
        setAppUserError(message);
      }
      setAppUser(null);
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

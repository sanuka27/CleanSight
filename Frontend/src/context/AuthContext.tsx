import { useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { 
  User, 
  onAuthStateChanged, 
  signOut as firebaseSignOut 
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { api, ApiError } from "@/lib/api";
import type { AppRole } from "@/lib/role";
import { AuthContext } from "./AuthContextShared";
import type { AppUser, AuthContextType } from "./AuthContextShared";

const isDev = import.meta.env.DEV;
const enableVisibilityRefresh = import.meta.env.VITE_ENABLE_VISIBILITY_REFRESH === "true";
const ACCOUNT_REMOVED_STORAGE_KEY = "cleansight.accountRemovedMessage";
const profilePollMsEnv = import.meta.env.VITE_PROFILE_POLL_MS;
const profilePollMs = profilePollMsEnv ? Number.parseInt(profilePollMsEnv, 10) : Number.NaN;
const profilePollInterval = Number.isFinite(profilePollMs) ? profilePollMs : 0;

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAppUserLoading, setIsAppUserLoading] = useState(false);
  const [appUserError, setAppUserError] = useState<string | null>(null);
  const [suspendedMessage, setSuspendedMessage] = useState<string | null>(null);
  const [accountRemovedMessage, setAccountRemovedMessage] = useState<string | null>(null);

  /**
   * When true, a sign-in / sign-up handler is actively running.
   * Prevents fetchAppUser from auto-signing-out on 404 during the
   * brief window between Firebase auth and backend profile creation.
   */
  const signingInRef = useRef(false);

  /**
   * Timestamp of last profile refresh (for throttling).
   */
  const lastRefreshRef = useRef<number>(0);

  /**
   * Previous role for dev logging.
   */
  const prevRoleRef = useRef<AppRole | null>(null);

  const markSigningIn = useCallback(() => {
    signingInRef.current = true;
    setSuspendedMessage(null);
    setAccountRemovedMessage(null);
    // Safety: auto-clear after 60 s so a crashed flow can't leave the flag stuck.
    setTimeout(() => { signingInRef.current = false; }, 60_000);
  }, []);

  const clearAccountRemovedMessage = useCallback(() => {
    setAccountRemovedMessage(null);
  }, []);

  /** Fetch backend profile from /api/auth/me */
  const fetchAppUser = useCallback(async (): Promise<AppUser | null> => {
    setIsAppUserLoading(true);
    setAppUserError(null);
    try {
      const res = await api.getMe();
      if (res.success && res.data?.user) {
        const newUser = res.data.user as AppUser;
        
        // Dev-only: Log role changes
        if (isDev && prevRoleRef.current && prevRoleRef.current !== newUser.role) {
          console.log(`[AuthContext] Role changed: ${prevRoleRef.current} → ${newUser.role}`);
        }
        
        setAppUser(newUser);
        prevRoleRef.current = newUser.role;
        setSuspendedMessage(null);
        setAccountRemovedMessage(null);
        
        // Profile found — any in-progress sign-in flow is complete.
        signingInRef.current = false;
        return newUser;
      } else {
        // Profile not found — user may not have completed registration yet.
        // This is normal during signup (register hasn't been called yet).
        setAppUser(null);
        prevRoleRef.current = null;
        return null;
      }
    } catch (err: unknown) {
      // Handle auth errors (token expired, forbidden, etc.)
      if (err instanceof ApiError) {
        // 410 = Account removed
        if (err.status === 410) {
          const deletedReason =
            typeof err.details?.deletedReason === "string" ? err.details.deletedReason : null;
          const removalMessage = deletedReason
            ? `Admin removed your account. Reason: ${deletedReason}`
            : "Admin removed your account.";
          if (typeof window !== "undefined") {
            sessionStorage.setItem(ACCOUNT_REMOVED_STORAGE_KEY, removalMessage);
          }
          setAccountRemovedMessage(removalMessage);
          setSuspendedMessage(null);
          setUser(null);
          setAppUser(null);
          prevRoleRef.current = null;
          await firebaseSignOut(auth);
          return null;
        }

        // 401 = Unauthorized (token expired), 403 = Forbidden
        if (err.status === 401 || err.status === 403) {
          if (isDev) {
            console.log(`[AuthContext] Auth error ${err.status}, forcing logout`);
          }
          // Check for account suspension specifically
          if (err.status === 403 && err.message?.toLowerCase().includes('suspended')) {
            const suspendedReason =
              typeof err.details?.suspendedReason === "string" ? err.details.suspendedReason : null;
            setSuspendedMessage(
              suspendedReason
                ? `Your account has been suspended. Reason: ${suspendedReason}`
                : 'Your account has been suspended. Please contact an administrator.'
            );
          }
          // Clear both user states immediately so needsOnboarding never
          // becomes true during the sign-out transition (before
          // onAuthStateChanged fires in response to firebaseSignOut).
          setUser(null);
          setAppUser(null);
          prevRoleRef.current = null;
          await firebaseSignOut(auth);
          return null;
        }
        
        // 404 means the backend has no profile for this Firebase user.
        if (err.status === 404) {
          if (signingInRef.current) {
            // A sign-in handler is running (Google onboarding / email signup)
            // — keep the Firebase session so the user can finish onboarding.
            setAppUser(null);
            prevRoleRef.current = null;
          } else {
            // No active sign-in → stale Firebase session whose backend
            // profile was deleted.  Sign out to return to guest mode.
            if (isDev) {
              console.log(`[AuthContext] Profile not found (404), forcing logout`);
            }
            setAppUser(null);
            prevRoleRef.current = null;
            await firebaseSignOut(auth);
          }
          return null;
        }
      }
      
      // Other errors
      const message = err instanceof Error ? err.message : "Failed to fetch profile";
      console.error("Failed to fetch app user:", message);
      setAppUserError(message);
      setAppUser(null);
      prevRoleRef.current = null;
      return null;
    } finally {
      setIsAppUserLoading(false);
    }
  }, []);

  /** Public method to re-fetch the backend profile */
  const refreshAppUser = useCallback(async (): Promise<AppUser | null> => {
    if (auth.currentUser) {
      return await fetchAppUser();
    }
    return null;
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

  // Optional: refresh backend profile on visibility change (disabled by default).
  useEffect(() => {
    if (!enableVisibilityRefresh) return;

    const THROTTLE_MS = 30_000; // Throttle to max 1 refresh per 30 seconds

    const handleVisibilityChange = () => {
      if (
        auth.currentUser &&
        !isAppUserLoading &&
        !isLoading &&
        document.visibilityState === "visible"
      ) {
        const now = Date.now();
        const timeSinceLastRefresh = now - lastRefreshRef.current;

        if (timeSinceLastRefresh >= THROTTLE_MS) {
          if (isDev) {
            console.log(`[AuthContext] Visibility change detected, refreshing profile (last refresh: ${Math.round(timeSinceLastRefresh / 1000)}s ago)`);
          }
          lastRefreshRef.current = now;
          fetchAppUser();
        } else if (isDev) {
          console.log(`[AuthContext] Visibility change throttled (${Math.round((THROTTLE_MS - timeSinceLastRefresh) / 1000)}s until next refresh allowed)`);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchAppUser, isAppUserLoading, isLoading]);

  // Periodic profile refresh to detect account changes (e.g., deletion) promptly.
  useEffect(() => {
    if (!user || profilePollInterval <= 0) return;

    const intervalId = setInterval(() => {
      if (auth.currentUser && !isAppUserLoading && !isLoading) {
        fetchAppUser();
      }
    }, profilePollInterval);

    return () => clearInterval(intervalId);
  }, [user, fetchAppUser, isAppUserLoading, isLoading, profilePollInterval]);

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setAppUser(null);
      setAppUserError(null);
      setSuspendedMessage(null);
      setAccountRemovedMessage(null);
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
    suspendedMessage,
    accountRemovedMessage,
    clearAccountRemovedMessage,
    logout,
    refreshAppUser,
    markSigningIn,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

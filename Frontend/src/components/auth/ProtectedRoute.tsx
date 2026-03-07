import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getUserRole } from "@/lib/role";
import type { AppRole } from "@/lib/role";
import { ONBOARDING_ROUTE, dashboardRouteForRole } from "@/constants/roles";
import { useEffect, useRef } from "react";
import { toast as sonnerToast } from "sonner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** 
   * Optional: restrict to specific roles (UX-only; server is source of truth).
   * DEPRECATED: Use expectedRole instead for dashboard routes.
   */
  allowedRoles?: AppRole[];
  /**
   * Optional: the exact role this route is designed for (e.g., "citizen" for /dashboard/citizen).
   * If user's role doesn't match, they'll be redirected to their correct dashboard.
   * Use this for role-specific dashboards to enforce proper routing.
   */
  expectedRole?: AppRole;
}

const isDev = import.meta.env.DEV;

export const ProtectedRoute = ({ children, allowedRoles, expectedRole }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, appUser, isAppUserLoading, needsOnboarding } = useAuth();
  const location = useLocation();
  /** Prevent the toast from firing on every re-render. */
  const toastedRef = useRef(false);

  // Determine the user's current role
  const role = appUser ? getUserRole(appUser) : undefined;

  // Check for role mismatch when expectedRole is specified
  const isRoleMismatch = expectedRole !== undefined && role !== undefined && role !== expectedRole;

  // Calculate the correct dashboard route for redirect
  const correctDashboardRoute = role ? dashboardRouteForRole(role) : null;
  
  // CRITICAL: Check if we're already on the correct route to prevent redirect loops
  const isAlreadyOnCorrectRoute = correctDashboardRoute && location.pathname === correctDashboardRoute;

  // Legacy allowedRoles check (for routes not using expectedRole)
  const isRoleBlocked =
    allowedRoles !== undefined &&
    role !== undefined &&
    !allowedRoles.includes(role);

  useEffect(() => {
    // Reset toast flag when route changes (prevents stale flag)
    toastedRef.current = false;
  }, [location.pathname]);

  useEffect(() => {
    if (isRoleMismatch && !isAlreadyOnCorrectRoute && !toastedRef.current) {
      toastedRef.current = true;
      if (isDev) {
        console.log(`[ProtectedRoute] Role mismatch: expected=${expectedRole}, actual=${role}, redirecting to ${correctDashboardRoute}`);
      }
      sonnerToast.info("Redirected to your dashboard");
    } else if (isRoleBlocked && !toastedRef.current) {
      toastedRef.current = true;
      if (isDev) {
        console.log(`[ProtectedRoute] Role blocked: role=${role}, allowedRoles=${allowedRoles?.join(',')}`);
      }
      sonnerToast.error("Access Denied", {
        description: "You don't have permission to view that page.",
      });
    }
  }, [isRoleMismatch, isRoleBlocked, isAlreadyOnCorrectRoute, expectedRole, role, correctDashboardRoute, allowedRoles]);

  // Wait for Firebase auth to settle
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in — redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Wait for backend appUser to load before rendering dashboard routes
  if (isAppUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Authenticated but no backend profile → force role onboarding
  if (needsOnboarding) {
    return <Navigate to={ONBOARDING_ROUTE} replace />;
  }

  // If this route expects a specific role and user has a different role, redirect to correct dashboard
  // BUT: only redirect if we're not already on the correct route (prevents loops)
  if (isRoleMismatch && !isAlreadyOnCorrectRoute && correctDashboardRoute) {
    return <Navigate to={correctDashboardRoute} replace />;
  }

  // Legacy role-based guard (UX only — server enforces the real check)
  if (isRoleBlocked) {
    // Redirect to the generic dashboard router which will find the right page
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

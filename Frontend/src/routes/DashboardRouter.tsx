import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/useAuth";
import { getUserRole } from "@/lib/role";
import { dashboardRouteForRole, ONBOARDING_ROUTE } from "@/constants/roles";

const isDev = import.meta.env.DEV;

/**
 * DashboardRouter — reads appUser.role from AuthContext
 * and redirects to the correct role-based dashboard.
 *
 * Renders a loading spinner while the backend profile is being fetched.
 * Falls back to citizen dashboard if role is unknown.
 */
const DashboardRouter = () => {
  const { appUser, isAppUserLoading, isLoading, isAuthenticated, needsOnboarding } = useAuth();

  // Wait for both Firebase auth and backend profile to resolve
  if (isLoading || isAppUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  // Safety: if somehow reached while logged out, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated but no profile → needs onboarding
  if (needsOnboarding) {
    return <Navigate to={ONBOARDING_ROUTE} replace />;
  }

  // At this point appUser is guaranteed non-null: needsOnboarding (which is
  // true iff isAuthenticated && appUser === null) already redirected above.
  const role = getUserRole(appUser!);
  const targetRoute = dashboardRouteForRole(role);
  
  if (isDev) {
    console.log(`[DashboardRouter] Routing user with role="${role}" to ${targetRoute}`);
  }
  
  return <Navigate to={targetRoute} replace />;
};

export default DashboardRouter;

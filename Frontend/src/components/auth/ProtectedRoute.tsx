import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getUserRole } from "@/lib/role";
import type { AppRole } from "@/lib/role";
import { ONBOARDING_ROUTE } from "@/constants/roles";
import { useEffect, useRef } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Optional: restrict to specific roles (UX-only; server is source of truth) */
  allowedRoles?: AppRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, appUser, isAppUserLoading, needsOnboarding } = useAuth();
  const { toast } = useToast();
  /** Prevent the toast from firing on every re-render. */
  const toastedRef = useRef(false);

  // Determine if the user has a role that is not in the allowed list
  const role = appUser ? getUserRole(appUser) : undefined;
  const isRoleBlocked =
    allowedRoles !== undefined &&
    role !== undefined &&
    !allowedRoles.includes(role);

  useEffect(() => {
    if (isRoleBlocked && !toastedRef.current) {
      toastedRef.current = true;
      toast({
        title: "Access Denied",
        description: "You don't have permission to view that page.",
        variant: "destructive",
      });
    }
  }, [isRoleBlocked, toast]);

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

  // Role-based guard (UX only — server enforces the real check)
  if (isRoleBlocked) {
    // Redirect to the generic dashboard router which will find the right page
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

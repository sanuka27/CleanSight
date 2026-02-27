import { useState } from "react";
import { motion } from "framer-motion";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Leaf, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { RoleSelector } from "@/components/auth/RoleSelector";
import { createUserProfile } from "@/services/userProfile";
import { toast } from "sonner";
import type { AppRole } from "@/lib/role";

/**
 * One-time role selection page shown to new Google sign-in users
 * whose backend profile does not yet exist.
 *
 * After the user picks a role and confirms, the profile is created
 * via the backend API and the user is redirected to /dashboard.
 */
const ChooseRole = () => {
  const [selectedRole, setSelectedRole] = useState<AppRole>("citizen");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user, appUser, isLoading: authLoading, isAppUserLoading, refreshAppUser } = useAuth();

  // If auth is still resolving, show a spinner
  if (authLoading || isAppUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated — shouldn't be here
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Profile already exists — skip onboarding
  if (appUser?.role) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await createUserProfile({
        name: user.displayName || "CleanSight User",
        email: user.email || "",
        role: selectedRole,
      });

      // Hydrate the context so guards see the new profile immediately
      await refreshAppUser();

      toast.success("Welcome to CleanSight!");
      navigate("/dashboard");
    } catch (error: unknown) {
      console.error("Onboarding error:", error);
      const msg =
        error instanceof Error ? error.message : "Failed to save your role. Please try again.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <Leaf className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="font-display text-2xl font-bold">
            Clean<span className="text-primary">Sight</span>
          </span>
        </Link>

        {/* Card */}
        <div className="bg-card rounded-2xl border border-border p-8 shadow-elevated">
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl font-bold mb-2">Choose Your Role</h1>
            <p className="text-muted-foreground">
              One last step — tell us how you'd like to help keep your city clean.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>I want to...</Label>
              <RoleSelector value={selectedRole} onChange={setSelectedRole} />
            </div>

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default ChooseRole;

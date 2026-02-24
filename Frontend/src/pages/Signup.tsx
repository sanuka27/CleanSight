import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, Mail, Lock, User, ArrowRight, Eye, EyeOff, Shield, Users, Globe } from "lucide-react";
import { MeshGradient } from "@/components/shared/MeshGradient";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getUserProfile } from "@/services/userProfile";
import { signInWithSocial, type SocialProvider } from "@/services/socialAuth";
import { mapFirebaseAuthErrorToMessage } from "@/utils/authErrors";
import { AUTH_PROVIDERS } from "@/constants/authProviders";
import { ONBOARDING_ROUTE } from "@/constants/roles";
import { toast } from "sonner";
import { RoleSelector } from "@/components/auth/RoleSelector";
import type { AppRole } from "@/lib/role";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AppRole>("citizen");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshAppUser, markSigningIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      markSigningIn();
      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update Firebase profile with name
      await updateProfile(userCredential.user, {
        displayName: name,
      });

      // Register user in backend MongoDB
      await api.register({
        name,
        email,
        role: selectedRole,
      });

      // Hydrate the AuthContext with the freshly-created backend profile
      await refreshAppUser();

      toast.success("Account created successfully!");
      navigate("/dashboard");
    } catch (error: unknown) {
      console.error("Signup error:", error);
      toast.error(mapFirebaseAuthErrorToMessage(error, "Registration"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignUp = async (providerType: SocialProvider) => {
    setIsLoading(true);
    try {
      markSigningIn();
      await signInWithSocial(providerType);

      // Check whether a backend profile already exists
      const profile = await getUserProfile();

      if (profile?.role) {
        // Returning user — hydrate context and go to dashboard
        await refreshAppUser();
        toast.success("Welcome back!");
        navigate("/dashboard");
      } else {
        // First-time social user — must pick a role on the onboarding page
        navigate(ONBOARDING_ROUTE);
      }
    } catch (error: unknown) {
      const label = AUTH_PROVIDERS[providerType]?.label ?? providerType;
      console.error(`${label} sign-up error:`, error);
      toast.error(mapFirebaseAuthErrorToMessage(error, `${label} sign-up`));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Visual */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <MeshGradient />

        {/* Content overlay */}
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-md"
          >
            {/* Logo */}
            <Link to="/" className="inline-block cursor-pointer group mx-auto">
              <motion.div
                className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center shadow-glow-lg mx-auto mb-8 group-hover:shadow-glow-xl transition-shadow"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Leaf className="w-10 h-10 text-white" />
              </motion.div>
            </Link>

            <h2 className="font-display text-3xl font-bold mb-4">
              Join{" "}
              <span className="text-gradient">CleanSight</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Be part of the movement. Report waste, volunteer for cleanups, and help keep your community clean.
            </p>

            {/* Feature cards */}
            <div className="space-y-3">
              {[
                { icon: Shield, title: "Secure & Private", desc: "Your data is protected with enterprise-grade security" },
                { icon: Users, title: "Community Driven", desc: "Join thousands of active community members" },
                { icon: Globe, title: "Real Impact", desc: "Every report leads to real environmental change" },
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  className="glass-premium rounded-xl p-4 flex items-center gap-4 text-left"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.15 }}
                >
                  <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{feature.title}</p>
                    <p className="text-xs text-muted-foreground">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-10 right-10 w-32 h-32 rounded-full border border-primary/20 animate-spin-slow" />
        <div className="absolute bottom-20 left-20 w-24 h-24 rounded-full border border-accent/20 animate-spin-slow" style={{ animationDirection: "reverse" }} />
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <Link to="/" className="flex items-center gap-3 justify-center lg:hidden mb-8">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <span className="font-display text-2xl font-bold">
              Clean<span className="text-primary">Sight</span>
            </span>
          </Link>

          {/* Form Header */}
          <div className="text-center lg:text-left mb-5">
            <motion.h1
              className="font-display text-2xl font-bold mb-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              Create Account
            </motion.h1>
            <motion.p
              className="text-muted-foreground text-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Join the community and start making a difference
            </motion.p>
          </div>

          {/* Form */}
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-3.5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {/* Role Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">I want to...</Label>
              <RoleSelector value={selectedRole} onChange={setSelectedRole} />
            </div>

            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-11 h-10 rounded-xl glass border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-10 rounded-xl glass border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 pr-11 h-10 rounded-xl glass border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Must be at least 6 characters
              </p>
            </div>

            {/* Submit Button */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 gradient-primary text-white rounded-xl shadow-glow hover:shadow-glow-lg transition-all font-semibold text-sm gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </motion.div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-4 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            {/* Social Logins */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSocialSignUp("google")}
                disabled={isLoading}
                className="h-10 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-all gap-2.5 font-medium"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSocialSignUp("facebook")}
                disabled={isLoading}
                className="h-10 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-all gap-2.5 font-medium"
              >
                <svg className="w-5 h-5 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </Button>
            </div>
          </motion.form>

          {/* Sign In Link */}
          <motion.p
            className="text-center text-sm text-muted-foreground mt-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:text-primary/80 transition-colors">
              Sign in
            </Link>
          </motion.p>

          {/* Terms */}
          <motion.p
            className="text-center text-xs text-muted-foreground mt-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            By signing up, you agree to our{" "}
            <Link to="/terms" className="text-primary hover:underline">Terms</Link>
            {" "}and{" "}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
};

export default Signup;

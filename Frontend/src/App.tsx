import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "./components/layout/PageTransition";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { lazy, Suspense } from "react";

// Lazy load pages for better performance
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ReportWaste = lazy(() => import("./pages/ReportWaste"));
const MapView = lazy(() => import("./pages/MapView"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Volunteer = lazy(() => import("./pages/Volunteer"));
const Signup = lazy(() => import("./pages/Signup"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Help = lazy(() => import("./pages/Help"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const ChooseRole = lazy(() => import("./pages/onboarding/ChooseRole"));

// Role-based dashboards
const DashboardRouter = lazy(() => import("./routes/DashboardRouter"));
const CitizenDashboard = lazy(() => import("./pages/dashboard/CitizenDashboard"));
const VolunteerDashboard = lazy(() => import("./pages/dashboard/VolunteerDashboard"));
const StaffDashboard = lazy(() => import("./pages/dashboard/StaffDashboard"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
  </div>
);

// Animated Routes Wrapper
const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><Landing /></PageTransition>} />
          <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
          <Route path="/signup" element={<PageTransition><Signup /></PageTransition>} />
          <Route path="/register" element={<Navigate to="/signup" replace />} />
          <Route path="/onboarding/role" element={<PageTransition><ChooseRole /></PageTransition>} />
          {/* /dashboard → role-based router */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <PageTransition><DashboardRouter /></PageTransition>
              </ProtectedRoute>
            } 
          />
          {/* Role-specific dashboard routes */}
          <Route 
            path="/dashboard/citizen" 
            element={
              <ProtectedRoute expectedRole="citizen">
                <PageTransition><CitizenDashboard /></PageTransition>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/volunteer" 
            element={
              <ProtectedRoute expectedRole="volunteer">
                <PageTransition><VolunteerDashboard /></PageTransition>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/staff" 
            element={
              <ProtectedRoute expectedRole="staff">
                <PageTransition><StaffDashboard /></PageTransition>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/admin" 
            element={
              <ProtectedRoute expectedRole="admin">
                <PageTransition><Dashboard /></PageTransition>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/report" 
            element={
              <ProtectedRoute>
                <PageTransition><ReportWaste /></PageTransition>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/map" 
            element={
              <ProtectedRoute>
                <PageTransition><MapView /></PageTransition>
              </ProtectedRoute>
            } 
          />
          <Route path="/volunteer" element={<PageTransition><Volunteer /></PageTransition>} />
          <Route path="/about" element={<PageTransition><About /></PageTransition>} />
          <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
          <Route path="/help" element={<PageTransition><Help /></PageTransition>} />
          <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
          <Route path="/terms" element={<PageTransition><Terms /></PageTransition>} />
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AnimatedRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

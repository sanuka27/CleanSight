import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "./components/layout/PageTransition";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AuthSideEffects } from "./components/auth/AuthSideEffects";
import { queryClient } from "./lib/queryClient";
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
const FeatureDetail = lazy(() => import("./pages/features/FeatureDetail"));
const PublicStats = lazy(() => import("./pages/PublicStats"));

// Role-based dashboards
const DashboardRouter = lazy(() => import("./routes/DashboardRouter"));
const CitizenDashboard = lazy(() => import("./pages/dashboard/CitizenDashboard"));
const VolunteerDashboard = lazy(() => import("./pages/dashboard/VolunteerDashboard"));
const StaffDashboard = lazy(() => import("./pages/dashboard/StaffDashboard"));

// Admin dashboard
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminOverview = lazy(() => import("./pages/admin/Overview"));
const AdminReports = lazy(() => import("./pages/admin/Reports"));
const AdminVolunteers = lazy(() => import("./pages/admin/Volunteers"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminAnalytics = lazy(() => import("./pages/admin/Analytics"));
const AdminMLAnalytics = lazy(() => import("./pages/admin/MLAnalytics"));
const AdminActivityFeed = lazy(() => import("./pages/admin/ActivityFeedPage"));
const AdminDocuments = lazy(() => import("./pages/admin/Documents"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminAuditLog = lazy(() => import("./pages/admin/AuditLog"));
const AdminMapView = lazy(() => import("./pages/admin/AdminMapView"));

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
  </div>
);

// Animated Routes Wrapper
const AnimatedRoutes = () => {
  const location = useLocation();
  // Keep admin sub-routes under the same key so AdminLayout stays mounted
  const routeKey = location.pathname.startsWith("/dashboard/admin")
    ? "/dashboard/admin"
    : location.pathname;

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={routeKey}>
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
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminOverview />} />
            <Route path="overview" element={<AdminOverview />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="map" element={<AdminMapView />} />
            <Route path="volunteers" element={<AdminVolunteers />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="ml-analytics" element={<AdminMLAnalytics />} />
            <Route path="activity-feed" element={<AdminActivityFeed />} />
            <Route path="documents" element={<AdminDocuments />} />
            <Route path="audit-log" element={<AdminAuditLog />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
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
          <Route path="/stats" element={<PageTransition><PublicStats /></PageTransition>} />
          <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
          <Route path="/help" element={<PageTransition><Help /></PageTransition>} />
          <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
          <Route path="/terms" element={<PageTransition><Terms /></PageTransition>} />
          <Route path="/features/:featureId" element={<PageTransition><FeatureDetail /></PageTransition>} />
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
          <AuthSideEffects />
          <AnimatedRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

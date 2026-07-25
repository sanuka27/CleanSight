/**
 * ProtectedRoute component tests
 *
 * We mock the entire `@/context/useAuth` module so we can inject
 * different authentication states without needing a real Firebase connection.
 * React Router is wrapped in a MemoryRouter so <Navigate> and useLocation work.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import React from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import type { AuthContextType, AppUser } from "@/context/AuthContextShared";

// ── Mock useAuth ──────────────────────────────────────────────────────────────

vi.mock("@/context/useAuth", () => ({
  useAuth: vi.fn(),
}));

// Mock sonner to prevent side effects in tests
vi.mock("sonner", () => ({
  toast: { info: vi.fn(), error: vi.fn() },
}));

import { useAuth } from "@/context/useAuth";

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildAppUser(role: AppUser["role"] = "citizen"): AppUser {
  return {
    id: "mongo-id-123",
    firebaseUid: "firebase-uid-123",
    name: "Test User",
    email: "test@example.com",
    role,
    avatar: null,
    phone: null,
    isVerified: true,
    reportsSubmitted: 0,
    cleanupsCompleted: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function buildAuthContext(overrides: Partial<AuthContextType> = {}): AuthContextType {
  return {
    user: null,
    appUser: null,
    isAuthenticated: false,
    isLoading: false,
    isAppUserLoading: false,
    appUserError: null,
    needsOnboarding: false,
    suspendedMessage: null,
    accountRemovedMessage: null,
    clearAccountRemovedMessage: vi.fn(),
    logout: vi.fn(),
    refreshAppUser: vi.fn(),
    markSigningIn: vi.fn(),
    ...overrides,
  };
}

/**
 * Render the ProtectedRoute inside a MemoryRouter with multiple routes
 * so that <Navigate> can actually work and we can assert the destination.
 */
function renderWithRouter(
  ui: React.ReactNode,
  { initialPath = "/protected" } = {}
) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/onboarding/role" element={<div>Onboarding Page</div>} />
        <Route path="/dashboard/citizen" element={<div>Citizen Dashboard</div>} />
        <Route path="/dashboard/volunteer" element={<div>Volunteer Dashboard</div>} />
        <Route path="/dashboard/admin" element={<div>Admin Dashboard</div>} />
        <Route path="/dashboard" element={<div>Generic Dashboard</div>} />
        <Route path="/protected" element={ui} />
        <Route path="/" element={<div>Landing Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

// ── Test Suites ───────────────────────────────────────────────────────────────

describe("ProtectedRoute", () => {
  const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Loading state ────────────────────────────────────────────────────────────

  it("shows a loading spinner when Firebase auth is still loading", () => {
    mockUseAuth.mockReturnValue(buildAuthContext({ isLoading: true }));

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    // The loading spinner div is rendered — content is not visible
    expect(screen.queryByText("Protected Content")).toBeNull();
    // The loading paragraph is present
    expect(screen.getByText("Loading...")).toBeTruthy();
  });

  it("shows a profile loading spinner when app user is loading", () => {
    mockUseAuth.mockReturnValue(
      buildAuthContext({ isAuthenticated: true, isAppUserLoading: true })
    );

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText("Protected Content")).toBeNull();
    expect(screen.getByText("Loading profile...")).toBeTruthy();
  });

  // ── Unauthenticated redirect ──────────────────────────────────────────────────

  it("redirects to /login when not authenticated", () => {
    mockUseAuth.mockReturnValue(
      buildAuthContext({ isAuthenticated: false, accountRemovedMessage: null })
    );

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("Login Page")).toBeTruthy();
    expect(screen.queryByText("Protected Content")).toBeNull();
  });

  it("redirects to / when accountRemovedMessage is set", () => {
    mockUseAuth.mockReturnValue(
      buildAuthContext({
        isAuthenticated: false,
        accountRemovedMessage: "Your account was removed",
      })
    );

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("Landing Page")).toBeTruthy();
  });

  // ── Onboarding redirect ───────────────────────────────────────────────────────

  it("redirects to /onboarding/role when needsOnboarding is true", () => {
    mockUseAuth.mockReturnValue(
      buildAuthContext({
        isAuthenticated: true,
        needsOnboarding: true,
        appUser: null,
      })
    );

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("Onboarding Page")).toBeTruthy();
    expect(screen.queryByText("Protected Content")).toBeNull();
  });

  // ── Happy path ────────────────────────────────────────────────────────────────

  it("renders children when user is authenticated with matching role", () => {
    const citizen = buildAppUser("citizen");
    mockUseAuth.mockReturnValue(
      buildAuthContext({
        isAuthenticated: true,
        appUser: citizen,
        needsOnboarding: false,
      })
    );

    // Render at /protected — the ProtectedRoute itself is the element at that path.
    // expectedRole=citizen matches the user's role, so no redirect fires.
    renderWithRouter(
      <ProtectedRoute expectedRole="citizen">
        <div>Protected Content</div>
      </ProtectedRoute>,
      { initialPath: "/protected" }
    );

    expect(screen.getByText("Protected Content")).toBeTruthy();
  });

  it("renders children when no expectedRole is specified (any authenticated user)", () => {
    mockUseAuth.mockReturnValue(
      buildAuthContext({
        isAuthenticated: true,
        appUser: buildAppUser("admin"),
        needsOnboarding: false,
      })
    );

    renderWithRouter(
      <ProtectedRoute>
        <div>Open Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("Open Protected Content")).toBeTruthy();
  });

  // ── Role mismatch redirect ────────────────────────────────────────────────────

  it("redirects to the correct dashboard when expectedRole doesn't match user's role", () => {
    const volunteer = buildAppUser("volunteer");
    mockUseAuth.mockReturnValue(
      buildAuthContext({
        isAuthenticated: true,
        appUser: volunteer,
        needsOnboarding: false,
      })
    );

    // Volunteer trying to access citizen-only route
    renderWithRouter(
      <ProtectedRoute expectedRole="citizen">
        <div>Citizen Only Content</div>
      </ProtectedRoute>,
      { initialPath: "/protected" }
    );

    // Should be redirected to the volunteer dashboard
    expect(screen.getByText("Volunteer Dashboard")).toBeTruthy();
    expect(screen.queryByText("Citizen Only Content")).toBeNull();
  });

  // ── allowedRoles (legacy guard) ───────────────────────────────────────────────

  it("redirects to /dashboard when role is not in allowedRoles", () => {
    const citizen = buildAppUser("citizen");
    mockUseAuth.mockReturnValue(
      buildAuthContext({
        isAuthenticated: true,
        appUser: citizen,
        needsOnboarding: false,
      })
    );

    renderWithRouter(
      <ProtectedRoute allowedRoles={["volunteer", "staff", "admin"]}>
        <div>Admin Only Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("Generic Dashboard")).toBeTruthy();
    expect(screen.queryByText("Admin Only Content")).toBeNull();
  });

  it("renders children when role IS in allowedRoles", () => {
    const admin = buildAppUser("admin");
    mockUseAuth.mockReturnValue(
      buildAuthContext({
        isAuthenticated: true,
        appUser: admin,
        needsOnboarding: false,
      })
    );

    renderWithRouter(
      <ProtectedRoute allowedRoles={["staff", "admin"]}>
        <div>Staff Admin Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("Staff Admin Content")).toBeTruthy();
  });
});

# Dashboard Audit Inventory

## Existing Dashboard-Related Pages/Components

| File Path | Role Intended | Current Data Source | Keep Unchanged? |
|---|---|---|---|
| `src/pages/Dashboard.tsx` | Admin/General (all roles land here) | Real API via `useAnalytics` (analytics summary, performance, volunteers) + some hardcoded fallback mock data for charts & recent activity | **YES — layout untouched, only wire remaining mock data** |
| `src/pages/ReportWaste.tsx` | All authenticated users | Real API (image upload + report creation) | YES |
| `src/pages/MapView.tsx` | All authenticated users | Real API (reports list) | YES |
| `src/pages/Volunteer.tsx` | Public / volunteer info | Static content | YES |

## Auth/Routing Components

| File Path | Purpose | Notes |
|---|---|---|
| `src/context/AuthContext.tsx` | Firebase auth state only | **Does NOT fetch backend role from /api/auth/me — needs update** |
| `src/components/auth/ProtectedRoute.tsx` | Checks Firebase `isAuthenticated` only | **Does NOT check backend appUser/role — needs update** |
| `src/lib/role.ts` | Role utility helpers (`getUserRole`, etc.) | Ready to use, supports citizen/volunteer/staff/admin |
| `src/lib/api.ts` | API client with `getMe()` method already | Ready for role hydration |

## Key Observations

1. **Only one dashboard exists** (`Dashboard.tsx`) — serves as the admin/overview dashboard with charts, stats, waste composition, and recent activity.
2. **No role-based routing** — all users land on `/dashboard` regardless of role.
3. **AuthContext only tracks Firebase user** — no backend `appUser` object with role.
4. **Dashboard.tsx uses real analytics data** via `useAnalytics` hook but still has hardcoded `recentActivity` array (mock).
5. **`api.getMe()` already exists** — returns user profile including `role` from MongoDB.

## Plan

- **Dashboard.tsx**: Keep layout exactly as-is. This becomes the **Admin Dashboard** (`/dashboard/admin`). Replace remaining mock data with real API calls.
- **New pages needed**:
  - `src/pages/dashboard/CitizenDashboard.tsx` — citizen-specific view (my reports, my stats)
  - `src/pages/dashboard/VolunteerDashboard.tsx` — assigned tasks, actions (accept/resolve)
  - `src/pages/dashboard/StaffDashboard.tsx` — triage view, assign volunteers, pending reports
- **New routing**:
  - `src/routes/DashboardRouter.tsx` — reads user role, redirects to correct dashboard
  - Role-based route guards on dashboard sub-routes
- **AuthContext update**: Fetch `/api/auth/me` after Firebase auth, store `appUser` with role.

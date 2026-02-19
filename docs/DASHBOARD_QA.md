# Dashboard QA Checklist

## Prerequisites
- MongoDB running with seeded data
- Backend running on port 5000
- Frontend running on port 8080 (or configured port)
- At least one user of each role in the database (citizen, volunteer, staff, admin)

---

## Test 1: Citizen Login → Citizen Dashboard
1. Log in as a **citizen** user
2. After login, navigate to `/dashboard`
3. **Expected**: Redirect to `/dashboard/citizen`
4. **Verify**:
   - Summary cards show: Total Reports, Pending, Assigned, Resolved (from user's own reports)
   - "Your Recent Reports" list shows the user's last 10 reports
   - Each report shows status badge, waste type, urgency, timestamp, and image thumbnail
   - "Report Waste" button navigates to `/report`
5. **No mock data** — all counts and reports come from `/api/dashboard/citizen`

## Test 2: Volunteer Login → Volunteer Dashboard
1. Log in as a **volunteer** user
2. Navigate to `/dashboard`
3. **Expected**: Redirect to `/dashboard/volunteer`
4. **Verify**:
   - Stats cards: Assigned (7d), Resolved (7d), My Active Tasks
   - "My Assigned Tasks" section shows reports assigned to this volunteer
   - Each assigned task has a "Mark Resolved" button
   - "Available Reports" section shows pending reports
   - Each available report has an "Accept Task" button
   - Clicking "Accept Task" assigns the report and refreshes the list
   - Clicking "Mark Resolved" moves the report to resolved
5. **No mock data** — all from `/api/dashboard/volunteer`

## Test 3: Staff Login → Staff Dashboard
1. Log in as a **staff** user
2. Navigate to `/dashboard`
3. **Expected**: Redirect to `/dashboard/staff`
4. **Verify**:
   - Stats: Pending, Assigned, Resolved Today, Volunteers count
   - "Pending Reports" panel with "Assign Volunteer" button on each
   - Clicking "Assign Volunteer" shows a list of available volunteers
   - Selecting a volunteer assigns the report
   - "Assigned Reports" panel shows currently assigned reports
   - "Top Volunteers (Last 7 Days)" shows leaderboard
5. **No mock data** — all from `/api/dashboard/staff`

## Test 4: Admin Login → Admin Dashboard
1. Log in as an **admin** user
2. Navigate to `/dashboard`
3. **Expected**: Redirect to `/dashboard/admin`
4. **Verify**:
   - Existing admin dashboard layout is unchanged
   - Stats cards show: Total Reports, Assigned, Resolved, Avg. Resolution
   - Area chart shows real activity data
   - Pie chart shows real waste composition
   - "Recent Updates" section shows real recent reports (not hardcoded mock)
   - All data comes from `/api/analytics/*` + `/api/dashboard/admin`
5. **Layout must be identical** to previous version (only data source changed)

## Test 5: Role-Based Route Guards
1. As a **citizen**, try navigating directly to `/dashboard/admin`
   - **Expected**: Redirect to `/dashboard/citizen`
2. As a **volunteer**, try navigating to `/dashboard/staff`
   - **Expected**: Redirect to `/dashboard/volunteer`
3. As a **staff**, navigating to `/dashboard/admin`
   - **Expected**: Redirect to `/dashboard/staff`
4. As an **admin**, all dashboard routes should be accessible

## Test 6: Auth Flow
1. Visit `/dashboard` while not logged in
   - **Expected**: Redirect to `/login`
2. Log in → should see loading spinner while profile loads from `/api/auth/me`
3. Once profile loaded → redirect to correct dashboard
4. Log out → redirect to login
5. No flicker or infinite redirect loops

## Test 7: Backend API Verification
```
GET /api/dashboard/me          → returns { role, dashboardPath }
GET /api/dashboard/citizen     → returns { myTotals, recentReports }
GET /api/dashboard/volunteer   → returns { assignedToMe, pendingNearby, myStats }
GET /api/dashboard/staff       → returns { pendingReports, assignedReports, resolvedTodayCount, volunteerSnapshot, availableVolunteers }
GET /api/dashboard/admin       → returns aggregated analytics payload
```

### Role enforcement (server-side):
- Citizen hitting `/api/dashboard/admin` → 403
- Volunteer hitting `/api/dashboard/staff` → 403
- Unauthenticated request → 401

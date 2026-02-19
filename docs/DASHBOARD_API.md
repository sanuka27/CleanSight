# Dashboard API Documentation

## Base URL
```
/api/dashboard
```

All endpoints require Firebase token authentication via `Authorization: Bearer <token>` header.

---

## GET /api/dashboard/me

**Description**: Returns the authenticated user's role and suggested dashboard path.

**Access**: Any authenticated user

**Response**:
```json
{
  "success": true,
  "data": {
    "role": "citizen",
    "dashboardPath": "/dashboard/citizen",
    "user": {
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "citizen"
    }
  }
}
```

---

## GET /api/dashboard/citizen

**Description**: Dashboard payload for citizen users — their own report statistics and recent reports.

**Access**: `citizen`, `admin`, `staff`

**Response**:
```json
{
  "success": true,
  "data": {
    "myTotals": {
      "total": 15,
      "pending": 5,
      "assigned": 4,
      "resolved": 6
    },
    "recentReports": [
      {
        "_id": "...",
        "status": "pending",
        "wasteType": "general",
        "urgency": "medium",
        "createdAt": "2026-02-15T10:00:00Z",
        "imageUrl": "https://...",
        "location": { "lat": 40.7, "lng": -74.0 },
        "description": "Waste pile near..."
      }
    ]
  }
}
```

---

## GET /api/dashboard/volunteer

**Description**: Dashboard payload for volunteer users — assigned tasks, available reports, and weekly stats.

**Access**: `volunteer`, `admin`, `staff`

**Response**:
```json
{
  "success": true,
  "data": {
    "assignedToMe": [
      {
        "_id": "...",
        "status": "assigned",
        "wasteType": "recyclable",
        "urgency": "high",
        "createdAt": "2026-02-14T08:00:00Z",
        "imageUrl": "https://...",
        "location": { "lat": 40.7, "lng": -74.0 },
        "description": "Recyclable waste..."
      }
    ],
    "pendingNearby": [
      {
        "_id": "...",
        "status": "pending",
        "wasteType": "general",
        "urgency": "low",
        "createdAt": "2026-02-16T12:00:00Z"
      }
    ],
    "myStats": {
      "assignedCount": 8,
      "resolvedCount": 5
    }
  }
}
```

---

## GET /api/dashboard/staff

**Description**: Staff triage dashboard — pending/assigned reports, volunteer leaderboard, and available volunteers for assignment.

**Access**: `staff`, `admin`

**Response**:
```json
{
  "success": true,
  "data": {
    "pendingReports": [ /* ... report objects ... */ ],
    "assignedReports": [ /* ... report objects ... */ ],
    "resolvedTodayCount": 3,
    "volunteerSnapshot": [
      {
        "firebaseUid": "...",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "resolvedCount": 12
      }
    ],
    "availableVolunteers": [
      {
        "firebaseUid": "...",
        "name": "Bob Smith",
        "email": "bob@example.com"
      }
    ]
  }
}
```

---

## GET /api/dashboard/admin

**Description**: Aggregated analytics payload for admin — combines summary, performance, volunteer analytics, and recent activity into a single request.

**Access**: `admin` only

**Response**:
```json
{
  "success": true,
  "data": {
    "range": { "from": "2026-02-10T...", "to": "2026-02-17T..." },
    "totals": { "total": 150, "pending": 30, "assigned": 40, "resolved": 80 },
    "rates": { "resolutionRate": 53.3, "assignmentRate": 26.7 },
    "series": [ { "date": "2026-02-10", "count": 12 } ],
    "topWasteTypes": [ { "wasteType": "general", "count": 50 } ],
    "urgencyBreakdown": [ { "urgency": "medium", "count": 70 } ],
    "performance": {
      "avgResolutionHours": 24.5,
      "medianResolutionHours": 18.0,
      "resolvedCount": 80,
      "avgTimeToAssignHours": 4.2,
      "assignedCount": 40
    },
    "volunteers": [
      {
        "firebaseUid": "...",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "assignedCount": 15,
        "resolvedCount": 12
      }
    ],
    "recentReports": [ /* last 10 reports */ ],
    "userCounts": { "totalUsers": 50, "totalVolunteers": 15 }
  }
}
```

---

## Error Responses

| Status | Scenario |
|--------|----------|
| 401 | Missing or invalid Firebase token |
| 403 | User role not authorized for the endpoint |
| 404 | User profile not found (registration incomplete) |
| 500 | Server error |

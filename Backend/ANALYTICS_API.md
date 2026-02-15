# Analytics API Documentation

## Base URL

```
/api/analytics
```

All endpoints require a valid Firebase ID token in the `Authorization: Bearer <token>` header.

---

## Query Parameters (all endpoints)

| Param    | Type   | Description                                 |
| -------- | ------ | ------------------------------------------- |
| `preset` | string | `7d`, `30d`, or `90d` (default: `7d`)       |
| `from`   | string | ISO-8601 start date (overrides preset)      |
| `to`     | string | ISO-8601 end date (overrides preset)        |

- If both `from` and `to` are provided, `preset` is ignored.
- Invalid dates return `400`.

---

## Role Access Matrix

| Endpoint               | citizen            | volunteer          | staff / admin      |
| ---------------------- | ------------------ | ------------------ | ------------------ |
| `GET /summary`         | Own reports only   | Global + myAssigned| Global             |
| `GET /performance`     | Own reports only   | Global             | Global             |
| `GET /volunteers`      | 403                | 403                | ✅ Full access     |

---

## Endpoints

### `GET /api/analytics/summary`

Returns totals, rates, time-series, waste types, and urgency breakdown.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "range": { "from": "2025-01-01T00:00:00.000Z", "to": "2025-01-07T23:59:59.999Z" },
    "totals": { "total": 42, "pending": 10, "assigned": 12, "resolved": 20 },
    "rates": { "resolutionRate": 47.6, "assignmentRate": 76.2 },
    "series": [
      { "date": "2025-01-01", "count": 5 },
      { "date": "2025-01-02", "count": 8 }
    ],
    "topWasteTypes": [
      { "wasteType": "general", "count": 15 },
      { "wasteType": "organic", "count": 10 }
    ],
    "urgencyBreakdown": [
      { "urgency": "high", "count": 8 },
      { "urgency": "medium", "count": 20 }
    ],
    "myAssigned": {
      "total": 5,
      "resolved": 3,
      "pending": 2
    }
  }
}
```

> `myAssigned` is only present when the caller is a **volunteer**.

---

### `GET /api/analytics/performance`

Returns resolution time and assignment time metrics.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "range": { "from": "...", "to": "..." },
    "avgResolutionHours": 18.5,
    "medianResolutionHours": 14.2,
    "resolvedCount": 20,
    "avgTimeToAssignHours": 6.3,
    "assignedCount": 32,
    "_note": "No resolved reports in range; timestamps may be unavailable."
  }
}
```

> `_note` appears only when values are `null`.

---

### `GET /api/analytics/volunteers`

**Staff / Admin only.** Returns per-volunteer assignment and resolution counts.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "range": { "from": "...", "to": "..." },
    "volunteers": [
      {
        "firebaseUid": "abc123",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "assignedCount": 12,
        "resolvedCount": 10
      }
    ]
  }
}
```

**Response 403 (non-staff):**

```json
{
  "success": false,
  "message": "Only staff or admin can view volunteer analytics."
}
```

---

## Error Responses

| Status | Meaning                      |
| ------ | ---------------------------- |
| 400    | Invalid query params / dates |
| 401    | Missing or invalid token     |
| 403    | Insufficient role            |
| 500    | Server error                 |

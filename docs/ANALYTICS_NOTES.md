# Frontend Analytics Integration Notes

## Overview

The Dashboard page (`src/pages/Dashboard.tsx`) consumes analytics data from the backend via three endpoints:

| Endpoint                          | Hook method         | Used for                           |
| --------------------------------- | ------------------- | ---------------------------------- |
| `GET /api/analytics/summary`      | `fetchSummary()`    | Stats cards, time-series chart, pie chart |
| `GET /api/analytics/performance`  | `fetchPerformance()`| Avg. resolution time stat card     |
| `GET /api/analytics/volunteers`   | `fetchVolunteers()` | (staff/admin only — future table)  |

## Key Files

| File                            | Purpose                                  |
| ------------------------------- | ---------------------------------------- |
| `src/hooks/useAnalytics.ts`     | React hook — state + fetch functions     |
| `src/lib/api.ts`               | API client methods (token auto-attached) |
| `src/lib/dateRange.ts`         | Preset builders (7d / 30d / 90d)         |
| `src/lib/role.ts`              | Role helpers for gating UI sections      |
| `src/types/analytics.ts`       | TypeScript interfaces for API responses  |

## Role Gating

- **citizen** — sees only their own report metrics (filtered server-side).
- **volunteer** — sees global metrics + a `myAssigned` section.
- **staff / admin** — sees global metrics + volunteer performance table.

Role checks are enforced **server-side**. The frontend attempts all fetches and handles 403s gracefully (caught by the hook, stored as `error`).

## How Data Flows

1. `Dashboard` mounts → calls `fetchSummary({ preset: '7d' })` and `fetchPerformance(…)`.
2. Hook stores response in state → `summary`, `performance`.
3. `useMemo` blocks derive `stats`, `CHART_DATA`, `PIE_DATA` from real data.
4. Existing UI components consume the derived arrays — **no layout changes**.
5. While loading, fallback zeros / placeholder arrays are rendered.

## Adding New Metrics

1. Add the aggregation query in `Backend/src/services/analyticsService.js`.
2. Call it from the relevant route in `Backend/src/routes/analytics.js`.
3. Add the TS type in `Frontend/src/types/analytics.ts`.
4. Add an API client method in `Frontend/src/lib/api.ts`.
5. Fetch it via `useAnalytics` hook or create a dedicated hook.
6. Wire the data into the Dashboard `useMemo` blocks.

## Presets

The dashboard supports `7d`, `30d`, `90d` presets. The state variable `preset` drives all fetches. If the UI later adds a dropdown or button group, just call `setPreset(newValue)` — the `useEffect` automatically re-fetches.

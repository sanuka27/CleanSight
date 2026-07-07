# Background Jobs — CleanSight Backend
**Tracking ID:** ARCH-008 ✅ **Implemented**

---

## Current State

CleanSight uses **BullMQ + Redis** for durable, retryable background job processing (ARCH-008).
When Redis is not available (no `REDIS_URL` configured), the system automatically falls back to
the `setImmediate` stopgap so the server works in plain local dev without Docker.

---

## Architecture

```
POST /api/reports
      │
      ├─ Redis available? ──YES──▶ mlQueue.add('analyze', { reportId, imageUrl })
      │                                    │
      │                                    ▼
      │                           BullMQ Queue ("ml-inference")
      │                                    │
      │                                    ▼
      │                           mlWorker.js (concurrency=1)
      │                                    │
      │                                    ├─ Phase 1: validateImageWithML()
      │                                    ├─ Phase 2: predictCategoryWithML()
      │                                    └─ Report.findByIdAndUpdate(...)
      │
      └─ Redis NOT available? ──▶ setImmediate(runMlAnalysis) [stopgap fallback]
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/config/redis.js` | `createRedisConnection()` factory — shared by Queue, Worker, QueueEvents |
| `src/queues/mlQueue.js` | BullMQ `Queue` on `"ml-inference"` channel + `enqueueMLAnalysis()` helper |
| `src/workers/mlWorker.js` | `runMlAnalysis()` logic + BullMQ `Worker` + graceful `closeMlWorker()` |
| `src/routes/reports.js` | Dispatch: `mlQueue.add()` with `setImmediate` fallback |
| `src/server.js` | `startMlWorker()` on boot, `closeMlWorker()` on SIGTERM/SIGINT |
| `docker-compose.yml` | Redis 7 Alpine for local development |

---

## Job Configuration

| Setting | Value |
|---------|-------|
| Queue name | `ml-inference` |
| Worker concurrency | `1` (single ML call at a time) |
| Retry attempts | `3` |
| Backoff | Exponential — 5 s → 10 s → 20 s |
| Keep completed jobs | Last 100 |
| Keep failed jobs | Last 500 |

---

## Local Development

### With queue (recommended)

```bash
# 1. Start Redis
docker compose up -d redis

# 2. Enable in .env
REDIS_URL=redis://localhost:6379

# 3. Start backend
pnpm run dev
```

The server log will show:
```
[redis] Connected ✓
[mlQueue] Queue initialised on "ml-inference" channel ✓
[mlWorker] Worker started on "ml-inference" channel (concurrency=1) ✓
```

### Without queue (plain dev — no Docker)

Leave `REDIS_URL` unset. The server warns once at startup and falls back to `setImmediate`.

```
[redis] REDIS_URL / REDIS_HOST not set — job queue disabled. ML inference will fall back to setImmediate.
```

---

## Jobs Remaining to Move to Queue

| Job | Trigger | Current Behaviour | Priority |
|-----|---------|-------------------|----------|
| ~~ML Phase 1 + Phase 2 inference~~ | ~~POST /api/reports~~ | ✅ **BullMQ queue** | — |
| Volunteer badge recalculation | Report resolved | Inline in request cycle | 🟡 Medium |
| Citizen badge recalculation | Report created | Inline in request cycle | 🟡 Medium |
| Volunteer stats update | Report resolved | Inline in request cycle | 🟡 Medium |
| Soft-delete cleanup | Scheduled (daily) | Not implemented | 🟢 Low |

---

## Production Deployment

Use a managed Redis service:
- **Upstash** (serverless, free tier) — set `REDIS_URL=rediss://...` and `REDIS_TLS=true`
- **Redis Cloud** — set `REDIS_URL=redis://:password@host:port`
- **Railway / Render Redis** — use the provided `REDIS_URL`

For high-throughput production, consider splitting the worker into a separate process:

```bash
# Separate worker entry point (future ARCH-009)
node src/workers/mlWorker.js
```

---

## References

- [BullMQ Docs](https://docs.bullmq.io/)
- [ioredis Docs](https://github.com/redis/ioredis)
- [Upstash Redis](https://upstash.com/)
- Related: ARCH-007 (async ML stopgap), ARCH-008 (this implementation)

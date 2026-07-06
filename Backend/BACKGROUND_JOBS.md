# Background Jobs — CleanSight Backend
**Tracking ID:** ARCH-008

---

## Current State

CleanSight has **no job queue or background worker system**. There is no Redis, BullMQ, Agenda, or equivalent infrastructure. All side-effects currently run either:

- **Synchronously** in the request/response cycle (badge recalculation, volunteer stats), or
- **Via `setImmediate`** as a stopgap for ML inference (introduced in ARCH-007 fix)

---

## Stopgap: `setImmediate` for ML Inference

`POST /api/reports` now saves the report immediately with `aiReviewStatus: 'pending'` and then fires ML analysis via `setImmediate` after the response is sent. This eliminates the worst-case 20s latency (ML_SERVICE_TIMEOUT_MS × 2) from the user's critical path.

**Limitations of this stopgap:**
- No retry on failure — if the process crashes mid-ML-run, the report stays `pending` forever
- No visibility — there's no way to observe queued or failed jobs without log grepping
- Memory-bound — a sudden spike of report submissions could queue thousands of `setImmediate` callbacks in the Node.js event loop
- No backpressure — there's nothing to throttle submission rate against ML capacity

---

## Jobs That Should Move to a Proper Queue

| Job | Trigger | Current Behaviour | Priority |
|-----|---------|-------------------|----------|
| ML Phase 1 + Phase 2 inference | `POST /api/reports` | `setImmediate` stopgap | 🔴 High |
| Volunteer badge recalculation | Report resolved | Inline in request cycle | 🟡 Medium |
| Citizen badge recalculation | Report created | Inline in request cycle | 🟡 Medium |
| Volunteer stats update | Report resolved | Inline in request cycle | 🟡 Medium |
| Email notifications | Status change, badge earned | Not implemented | 🟢 Low |
| Soft-delete cleanup | Scheduled (daily) | Not implemented | 🟢 Low |

---

## Recommended Solution

**BullMQ + Redis** is the recommended stack for this project:

- BullMQ is the spiritual successor to Bull, works well with Node.js ESM projects
- Redis is already a common dependency in production Node stacks
- BullMQ provides: retries, backoff, job visibility, rate limiting, and a UI (Bull Board)

### Migration Path

1. Add Redis to the infrastructure (Docker Compose for local dev, managed Redis for prod)
2. Install `bullmq` and `ioredis` as dependencies
3. Create `src/queues/mlQueue.js` — replace `setImmediate` in `reports.js` with `mlQueue.add('analyze', { reportId, imageUrl })`
4. Create `src/workers/mlWorker.js` — process ML jobs and update the Report document
5. Create `src/queues/badgeQueue.js` + `src/workers/badgeWorker.js` — move badge/stats recalculation out of the request cycle
6. Add Bull Board or similar for job monitoring

### Example (BullMQ sketch)
```js
// src/queues/mlQueue.js
import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis.js';

export const mlQueue = new Queue('ml-inference', { connection: redisConnection });
```

```js
// src/workers/mlWorker.js
import { Worker } from 'bullmq';
import { runMlAnalysis } from '../services/mlService.js';
import { redisConnection } from '../config/redis.js';

new Worker('ml-inference', async (job) => {
  await runMlAnalysis(job.data.reportId, job.data.imageUrl);
}, { connection: redisConnection });
```

---

## References

- [BullMQ Docs](https://docs.bullmq.io/)
- [Bull Board (monitoring UI)](https://github.com/felixmosh/bull-board)
- Related issues: ARCH-007 (async ML stopgap)

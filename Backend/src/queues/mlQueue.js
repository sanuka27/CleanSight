/**
 * ML Inference Queue
 *
 * A BullMQ Queue for dispatching ML analysis jobs after a report is created.
 * Jobs are added by POST /api/reports and consumed by mlWorker.js.
 *
 * Queue name: "ml-inference"
 * Job payload: { reportId: string, imageUrl: string }
 *
 * If Redis is not configured, mlQueue is exported as null and callers
 * fall back to the setImmediate stopgap automatically.
 */

import { Queue } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';

const connection = createRedisConnection();

/** @type {import('bullmq').Queue | null} */
export let mlQueue = null;

if (connection) {
  mlQueue = new Queue('ml-inference', {
    connection,
    defaultJobOptions: {
      // Retry up to 3 times with exponential backoff (5s → 10s → 20s)
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5_000,
      },
      // Keep a rolling window of recent jobs for visibility without
      // filling Redis indefinitely.
      removeOnComplete: { count: 100 },
      removeOnFail:     { count: 500 },
    },
  });

  console.log('[mlQueue] Queue initialised on "ml-inference" channel ✓');
}

/**
 * Enqueue an ML analysis job.
 * Falls back silently to `null` if the queue is unavailable.
 *
 * @param {string} reportId  - MongoDB ObjectId string
 * @param {string} imageUrl  - Publicly accessible image URL
 * @returns {Promise<import('bullmq').Job | null>}
 */
export async function enqueueMLAnalysis(reportId, imageUrl) {
  if (!mlQueue) return null;
  return mlQueue.add('analyze', { reportId, imageUrl });
}

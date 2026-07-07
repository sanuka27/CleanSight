/**
 * ML Inference Worker
 *
 * Processes jobs from the "ml-inference" BullMQ queue.
 * Each job carries { reportId, imageUrl } and runs the two-phase ML pipeline:
 *   Phase 1 — Binary classifier: is this an image of waste?
 *   Phase 2 — Category classifier: what type of waste?
 *
 * The worker updates the Report document in MongoDB with the results.
 *
 * CONCURRENCY
 * ───────────
 * Set to 1 to avoid saturating the ML microservices. Increase if the ML
 * services are horizontally scaled.
 *
 * RETRY POLICY
 * ────────────
 * Configured on the Queue (mlQueue.js): 3 attempts, exponential backoff
 * starting at 5 s. BullMQ handles this automatically — throwing from the
 * processor signals a failure and triggers a retry.
 *
 * FALLBACK (no Redis)
 * ───────────────────
 * runMlAnalysis() is also exported so that reports.js can call it directly
 * via setImmediate when the queue is unavailable (Redis not configured).
 */

import { Worker } from 'bullmq';
import Report from '../models/Report.js';
import { validateImageWithML, predictCategoryWithML } from '../services/mlService.js';
import { createRedisConnection } from '../config/redis.js';

// ── Core ML analysis logic ────────────────────────────────────────────────────

/**
 * Run Phase 1 (binary validation) + Phase 2 (category prediction) for a report.
 * Persists results directly onto the Report document.
 *
 * Exported so it can be called directly as a setImmediate fallback when Redis
 * is not available.
 *
 * @param {string | import('mongoose').Types.ObjectId} reportId
 * @param {string} imageUrl
 */
export async function runMlAnalysis(reportId, imageUrl) {
  let imageValidationLabel     = 'error';
  let imageValidationConfidence = null;
  let aiReviewStatus           = 'manual_review';
  let wasteCategoryPredictedLabel = 'pending';
  let wasteCategoryConfidence  = null;
  let wasteCategoryEntropy     = null;
  let wasteCategoryConfidenceLevel = null;
  let wasteCategoryAllPredictions  = null;
  let wasteCategoryReviewStatus    = 'manual_review';

  try {
    // ── Phase 1: Binary classifier ────────────────────────────────────────
    const mlValidation = await validateImageWithML(imageUrl);

    if (mlValidation.success) {
      imageValidationLabel      = mlValidation.label;
      imageValidationConfidence = mlValidation.confidence;

      if (imageValidationLabel === 'non-trash') {
        aiReviewStatus = 'flagged';
      } else if (mlValidation.recommendation === 'manual_review') {
        aiReviewStatus = 'manual_review';
      } else {
        aiReviewStatus = 'approved';
      }

      // ── Phase 2: Category classifier (only for confirmed waste) ──────────
      if (imageValidationLabel === 'trash') {
        const categoryPrediction = await predictCategoryWithML(imageUrl);

        if (categoryPrediction.success) {
          wasteCategoryPredictedLabel  = categoryPrediction.predictedLabel;
          wasteCategoryConfidence      = categoryPrediction.confidence;
          wasteCategoryEntropy         = categoryPrediction.entropy;
          wasteCategoryConfidenceLevel = categoryPrediction.confidenceLevel;
          wasteCategoryAllPredictions  = categoryPrediction.allPredictions;
          wasteCategoryReviewStatus    = categoryPrediction.reviewStatus;
          if (aiReviewStatus !== 'approved') {
            wasteCategoryReviewStatus = 'manual_review';
          }
        } else {
          console.warn('[mlWorker] Phase 2 prediction failed:', categoryPrediction.error);
          wasteCategoryPredictedLabel = 'error';
          wasteCategoryReviewStatus   = 'manual_review';
        }
      }
    } else {
      console.warn('[mlWorker] Phase 1 validation failed:', mlValidation.error);
    }
  } catch (err) {
    // Re-throw so BullMQ can record the failure and schedule a retry.
    // When called directly (fallback), the caller's own try/catch handles it.
    throw err;
  }

  // Persist ML results onto the Report document
  await Report.findByIdAndUpdate(reportId, {
    imageValidationLabel,
    imageValidationConfidence,
    aiReviewStatus,
    wasteCategoryPredictedLabel,
    wasteCategoryConfidence,
    wasteCategoryEntropy,
    wasteCategoryConfidenceLevel,
    wasteCategoryAllPredictions,
    wasteCategoryReviewStatus,
  });
}

// ── BullMQ Worker ─────────────────────────────────────────────────────────────

/** @type {import('bullmq').Worker | null} */
let _worker = null;

/**
 * Start the BullMQ worker that processes "ml-inference" jobs.
 * Should be called once during server startup (server.js).
 * Does nothing if Redis is not configured (connection is null).
 *
 * @returns {import('bullmq').Worker | null}
 */
export function startMlWorker() {
  const connection = createRedisConnection();
  if (!connection) return null;

  _worker = new Worker(
    'ml-inference',
    async (job) => {
      const { reportId, imageUrl } = job.data;
      console.log(`[mlWorker] Processing job ${job.id} for report ${reportId} (attempt ${job.attemptsMade + 1})`);
      await runMlAnalysis(reportId, imageUrl);
      console.log(`[mlWorker] Job ${job.id} completed for report ${reportId}`);
    },
    {
      connection,
      concurrency: 1,
    }
  );

  _worker.on('failed', (job, err) => {
    console.error(
      `[mlWorker] Job ${job?.id} failed for report ${job?.data?.reportId} ` +
      `(attempt ${job?.attemptsMade}/${job?.opts?.attempts}): ${err.message}`
    );
  });

  _worker.on('error', (err) => {
    console.error('[mlWorker] Worker error:', err.message);
  });

  console.log('[mlWorker] Worker started on "ml-inference" channel (concurrency=1) ✓');
  return _worker;
}

/**
 * Gracefully close the worker, allowing in-flight jobs to finish.
 * Call this during process shutdown (SIGTERM / SIGINT).
 *
 * @returns {Promise<void>}
 */
export async function closeMlWorker() {
  if (_worker) {
    await _worker.close();
    _worker = null;
    console.log('[mlWorker] Worker closed gracefully.');
  }
}

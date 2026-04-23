import config from '../config/app.js';

const DEFAULT_PHASE1_URL = 'http://localhost:8000';
const DEFAULT_PHASE2_URL = 'http://localhost:8001';

const ML_SERVICE_URL = (config.ml.serviceUrl || DEFAULT_PHASE1_URL).replace(/\/+$/, '');
const ML_CATEGORY_SERVICE_URL = (config.ml.categoryServiceUrl || DEFAULT_PHASE2_URL).replace(/\/+$/, '');
const ML_SERVICE_TIMEOUT_MS = Number.isFinite(config.ml.timeoutMs) ? config.ml.timeoutMs : 10000;

const VALID_BINARY_LABELS = new Set(['trash', 'non-trash']);
const VALID_CATEGORIES = new Set(['glass', 'mixed', 'paper', 'plastic']);
const VALID_CONFIDENCE_LEVELS = new Set(['HIGH', 'MODERATE', 'LOW', 'VERY LOW']);
const VALID_REVIEW_STATUSES = new Set(['auto_accepted', 'flagged', 'manual_review', 'pending']);

function clampConfidence(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(1, numeric));
}

/**
 * Entropy is normalized [0, 1] by our ML service, but we only enforce
 * non-negative here to avoid silently losing information if a raw
 * (unnormalized) value ever arrives.
 */
function clampEntropy(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, numeric);
}

function normalizeBinaryLabel(rawLabel) {
  const normalized = String(rawLabel || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');

  if (normalized === 'trash' || normalized === 'waste') return 'trash';
  if (normalized === 'non-trash' || normalized === 'nontrash' || normalized === 'clean') return 'non-trash';
  return normalized;
}

function inferConfidenceLevel(confidence) {
  if (confidence >= config.ml.categoryHighConfidenceThreshold) return 'HIGH';
  if (confidence >= 0.5) return 'MODERATE';
  if (confidence >= 0.3) return 'LOW';
  return 'VERY LOW';
}

function inferReviewStatus(confidenceLevel) {
  if (confidenceLevel === 'HIGH') return 'auto_accepted';
  if (confidenceLevel === 'MODERATE') return 'flagged';
  return 'manual_review';
}

async function safeReadError(response) {
  try {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await response.json();
      if (body && typeof body.detail === 'string') return body.detail;
      if (body && typeof body.error === 'string') return body.error;
      return JSON.stringify(body).slice(0, 500);
    }

    const textBody = await response.text();
    return textBody ? textBody.slice(0, 500) : undefined;
  } catch {
    return undefined;
  }
}

async function callMlEndpoint(baseUrl, path, imageUrl) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ML_SERVICE_TIMEOUT_MS);

  try {
    const params = new URLSearchParams();
    params.append('image_url', imageUrl);

    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await safeReadError(response);
      const baseMessage = `ML service returned HTTP ${response.status}`;
      return { ok: false, error: detail ? `${baseMessage}: ${detail}` : baseMessage };
    }

    const payload = await response.json();
    return { ok: true, payload };
  } catch (error) {
    if (error && error.name === 'AbortError') {
      return { ok: false, error: 'ML service request timed out' };
    }
    return { ok: false, error: 'ML service unavailable or prediction failed' };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Call the Phase 1 Binary Classifier ML Service.
 * @param {string} imageUrl - The URL of the uploaded image
 * @returns {Promise<Object>} The prediction result (label, confidence, recommendation, error)
 */
export const validateImageWithML = async (imageUrl) => {
  const response = await callMlEndpoint(ML_SERVICE_URL, '/predict', imageUrl);
  if (!response.ok) {
    return { success: false, error: response.error };
  }

  const payload = response.payload || {};
  if (payload.success === false) {
    return {
      success: false,
      error: typeof payload.error === 'string' ? payload.error : 'Phase 1 prediction failed',
    };
  }

  const label = normalizeBinaryLabel(payload.label ?? (payload.isWaste ? 'trash' : 'non-trash'));
  const confidence = clampConfidence(payload.confidence);

  if (!VALID_BINARY_LABELS.has(label) || confidence === null) {
    return { success: false, error: 'Invalid Phase 1 response contract from ML service' };
  }

  const recommendation = payload.recommendation === 'automated_approval'
    ? 'automated_approval'
    : confidence >= config.ml.binaryConfidenceThreshold
      ? 'automated_approval'
      : 'manual_review';

  return {
    success: true,
    isWaste: label === 'trash',
    category: null,
    label,
    confidence,
    recommendation,
  };
};

/**
 * Call the Phase 2 Category Classifier ML Service.
 * @param {string} imageUrl - The URL of the uploaded image
 * @returns {Promise<Object>} The category prediction result
 */
export const predictCategoryWithML = async (imageUrl) => {
  const response = await callMlEndpoint(ML_CATEGORY_SERVICE_URL, '/predict-category', imageUrl);
  if (!response.ok) {
    return {
      success: false,
      error: response.error,
    };
  }

  const payload = response.payload || {};
  if (payload.success === false) {
    return {
      success: false,
      error: typeof payload.error === 'string' ? payload.error : 'Phase 2 prediction failed',
    };
  }

  const predictedLabel = String(payload.category ?? payload.predicted_class ?? '').trim().toLowerCase();
  const confidence = clampConfidence(payload.confidence);
  const entropy = clampEntropy(payload.entropy ?? 0);

  if (!VALID_CATEGORIES.has(predictedLabel) || confidence === null) {
    return { success: false, error: 'Invalid Phase 2 response contract from ML service' };
  }

  const confidenceLevel = VALID_CONFIDENCE_LEVELS.has(payload.confidence_level)
    ? payload.confidence_level
    : inferConfidenceLevel(confidence);

  const reviewStatus = VALID_REVIEW_STATUSES.has(payload.review_status)
    ? payload.review_status
    : inferReviewStatus(confidenceLevel);

  const allPredictions = Array.isArray(payload.all_predictions)
    ? payload.all_predictions
        .map((prediction) => {
          const className = String(prediction.class_name ?? prediction.class ?? '').trim().toLowerCase();
          const classConfidence = clampConfidence(prediction.confidence);
          if (!VALID_CATEGORIES.has(className) || classConfidence === null) return null;
          return { class: className, confidence: classConfidence };
        })
        .filter(Boolean)
    : [];

  return {
    success: true,
    isWaste: true,
    category: predictedLabel,
    predictedLabel,
    confidence,
    entropy,
    confidenceLevel,
    reviewStatus,
    allPredictions,
  };
};

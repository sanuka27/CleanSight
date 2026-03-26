const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const ML_CATEGORY_SERVICE_URL = process.env.ML_CATEGORY_SERVICE_URL || 'http://localhost:8001';
const ML_SERVICE_TIMEOUT_DEFAULT_MS = 10000;
const mlServiceTimeoutRaw = process.env.ML_SERVICE_TIMEOUT_MS;
const mlServiceTimeoutParsed = Number(mlServiceTimeoutRaw);
const ML_SERVICE_TIMEOUT_MS = Number.isFinite(mlServiceTimeoutParsed) && mlServiceTimeoutRaw != null && mlServiceTimeoutRaw.trim() !== ''
  ? mlServiceTimeoutParsed
  : ML_SERVICE_TIMEOUT_DEFAULT_MS;

/**
 * Call the Phase 1 Binary Classifier ML Service.
 * @param {string} imageUrl - The URL of the uploaded image
 * @returns {Promise<Object>} The prediction result (label, confidence, recommendation, error)
 */
export const validateImageWithML = async (imageUrl) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, ML_SERVICE_TIMEOUT_MS);

  try {
    const params = new URLSearchParams();
    params.append('image_url', imageUrl);

    // Using native fetch logic with explicit timeout via AbortController
    const url = `${ML_SERVICE_URL}/predict`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
      signal: controller.signal,
    });

    if (response.ok) {
        const data = await response.json();
        return {
            success: true,
            label: data.label,
            confidence: data.confidence,
            recommendation: data.recommendation,
        };
    } else {
        let errorDetail;
        try {
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const errorBody = await response.json();
                if (errorBody && typeof errorBody.detail === 'string') {
                    errorDetail = errorBody.detail;
                }
            } else {
                const textBody = await response.text();
                if (textBody) {
                    errorDetail = textBody.slice(0, 500);
                }
            }
        } catch (parseError) {
            // Swallow parsing errors; we still log status below.
        }
        
        console.warn('ML Service HTTP Error', {
            status: response.status,
            statusText: response.statusText,
            detail: errorDetail,
        });

        const baseMessage = `ML service returned an error (status ${response.status})`;

        return {
            success: false,
            error: errorDetail ? `${baseMessage}: ${errorDetail}` : baseMessage,
        };
    }
  } catch (error) {
    if (error && error.name === 'AbortError') {
      console.warn('ML Service Error: request timed out');
      return {
        success: false,
        error: 'ML service request timed out'
      };
    }
    console.warn('ML Service Error: ' + error.message);
    return {
      success: false,
      error: 'ML service unavailable or prediction failed'
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Call the Phase 2 Category Classifier ML Service.
 * @param {string} imageUrl - The URL of the uploaded image
 * @returns {Promise<Object>} The category prediction result
 */
export const predictCategoryWithML = async (imageUrl) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, ML_SERVICE_TIMEOUT_MS);

  try {
    const params = new URLSearchParams();
    params.append('image_url', imageUrl);

    const url = `${ML_CATEGORY_SERVICE_URL}/predict-category`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
      signal: controller.signal,
    });

    if (response.ok) {
      const data = await response.json();

      // Check if prediction actually succeeded
      if (!data.success) {
        console.warn('ML Category Service returned success=false', {
          error: data.error
        });
        return {
          success: false,
          error: data.error || 'ML category service prediction failed'
        };
      }

      // Determine review status based on confidence level
      let reviewStatus = 'pending';
      if (data.confidence_level === 'HIGH') {
        reviewStatus = 'auto_accepted';
      } else if (data.confidence_level === 'MODERATE') {
        reviewStatus = 'flagged';
      } else {
        reviewStatus = 'manual_review';
      }

      // Normalize all_predictions field names: class_name → class
      const rawPredictions = Array.isArray(data.all_predictions) ? data.all_predictions : [];
      const normalizedPredictions = rawPredictions.map((prediction) => ({
        class: prediction.class_name || prediction.class,
        confidence: prediction.confidence,
      }));

      return {
        success: true,
        predictedLabel: data.predicted_class,
        confidence: data.confidence,
        entropy: data.entropy,
        confidenceLevel: data.confidence_level,
        allPredictions: normalizedPredictions,
        reviewStatus,
      };
    } else {
      let errorDetail;
      try {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errorBody = await response.json();
          if (errorBody && typeof errorBody.detail === 'string') {
            errorDetail = errorBody.detail;
          }
        } else {
          const textBody = await response.text();
          if (textBody) {
            errorDetail = textBody.slice(0, 500);
          }
        }
      } catch (parseError) {
        // Swallow parsing errors
      }

      console.warn('ML Category Service HTTP Error', {
        status: response.status,
        statusText: response.statusText,
        detail: errorDetail,
      });

      const baseMessage = `ML category service returned an error (status ${response.status})`;

      return {
        success: false,
        error: errorDetail ? `${baseMessage}: ${errorDetail}` : baseMessage,
      };
    }
  } catch (error) {
    if (error && error.name === 'AbortError') {
      console.warn('ML Category Service Error: request timed out');
      return {
        success: false,
        error: 'ML category service request timed out'
      };
    }
    console.warn('ML Category Service Error: ' + error.message);
    return {
      success: false,
      error: 'ML category service unavailable or prediction failed'
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Call the Phase 1 Binary Classifier ML Service.
 * @param {string} imageUrl - The URL of the uploaded image
 * @returns {Promise<Object>} The prediction result (label, confidence, recommendation, error)
 */
export const validateImageWithML = async (imageUrl) => {
  try {
    const params = new URLSearchParams();
    params.append('image_url', imageUrl);

    // Using native fetch logic
    const response = await fetch(\\/predict\, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
      // AbortSignal needs Node 16.14+ for .timeout fallback, so keeping it safe
      // Native Node 18 fetch
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
        console.warn('ML Service HTTP Error');
        return {
            success: false,
            error: 'ML service returned an error'
        };
    }
  } catch (error) {
    console.warn('ML Service Error: ' + error.message);
    return {
      success: false,
      error: 'ML service unavailable or prediction failed'
    };
  }
};

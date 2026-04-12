/**
 * Application Configuration
 * 
 * Centralizes all environment variables and configuration.
 * Provides type safety and validation for config values.
 */

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// ─────────────────────────────────────────────────────────────────────
// Environment Helpers
// ─────────────────────────────────────────────────────────────────────

/**
 * Get environment variable with optional default value.
 */
function getEnv(key, defaultValue = undefined) {
  const value = process.env[key];
  if (value === undefined || value === '') {
    if (defaultValue === undefined) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return defaultValue;
  }
  return value;
}

/**
 * Get environment variable as integer.
 */
function getEnvInt(key, defaultValue) {
  const value = getEnv(key, defaultValue?.toString());
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be an integer`);
  }
  return parsed;
}

/**
 * Get environment variable as float.
 */
function getEnvFloat(key, defaultValue) {
  const value = getEnv(key, defaultValue?.toString());
  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a float`);
  }
  return parsed;
}

/**
 * Get environment variable as boolean.
 */
function getEnvBool(key, defaultValue = false) {
  const value = getEnv(key, defaultValue.toString());
  return value === 'true' || value === '1' || value === 'yes';
}

// ─────────────────────────────────────────────────────────────────────
// Configuration Object
// ─────────────────────────────────────────────────────────────────────

const config = {
  // Environment
  env: getEnv('NODE_ENV', 'development'),
  isDevelopment: getEnv('NODE_ENV', 'development') === 'development',
  isProduction: getEnv('NODE_ENV', 'development') === 'production',
  isTest: getEnv('NODE_ENV', 'development') === 'test',

  // Server
  server: {
    port: getEnvInt('PORT', 5000),
    host: getEnv('HOST', '0.0.0.0'),
  },

  // Database
  database: {
    uri: getEnv('MONGODB_URI', 'mongodb://localhost:27017/cleansight'),
    maxPoolSize: getEnvInt('DB_MAX_POOL_SIZE', 10),
  },

  // Client
  client: {
    url: getEnv('CLIENT_URL', 'http://localhost:8080'),
  },

  // Firebase
  firebase: {
    projectId: getEnv('FIREBASE_PROJECT_ID', ''),
    // Note: Firebase Admin SDK uses service account credentials
    // Either via GOOGLE_APPLICATION_CREDENTIALS env var or inline config
  },

  // Admin
  admin: {
    apiKey: getEnv('ADMIN_API_KEY', ''),
  },

  // Rate Limiting
  rateLimit: {
    windowMs: getEnvInt('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
    maxRequests: getEnvInt('RATE_LIMIT_MAX_REQUESTS', 100),
  },

  // File Upload
  upload: {
    maxFileSize: getEnvInt('MAX_FILE_SIZE', 10 * 1024 * 1024), // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },

  // Pagination
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },

  // ML Service
  ml: {
    serviceUrl: getEnv('ML_SERVICE_URL', ''),
    categoryServiceUrl: getEnv('ML_CATEGORY_SERVICE_URL', ''),
    timeoutMs: getEnvInt('ML_SERVICE_TIMEOUT_MS', getEnvInt('ML_SERVICE_TIMEOUT', 30000)),
    binaryConfidenceThreshold: getEnvFloat('BINARY_CONFIDENCE_THRESHOLD', 0.70),
    categoryHighConfidenceThreshold: getEnvFloat('CATEGORY_HIGH_CONFIDENCE_THRESHOLD', 0.80),
  },

  // Logging
  logging: {
    level: getEnv('LOG_LEVEL', 'info'),
    format: getEnv('LOG_FORMAT', 'json'),
  },
};

// ─────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────

/**
 * Validate required configuration on startup.
 */
export function validateConfig() {
  const errors = [];

  // In production, certain configs are required
  if (config.isProduction) {
    if (!config.database.uri || config.database.uri.includes('localhost')) {
      errors.push('MONGODB_URI must be set to a production database in production');
    }
    if (!config.client.url || config.client.url.includes('localhost')) {
      errors.push('CLIENT_URL must be set to production URL in production');
    }
    if (!config.admin.apiKey) {
      errors.push('ADMIN_API_KEY must be set in production');
    }
  }

  if (errors.length > 0) {
    console.error('Configuration errors:');
    errors.forEach(err => console.error(`  - ${err}`));
    throw new Error('Invalid configuration. See errors above.');
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────

export default config;

// Named exports for convenience
export const {
  env,
  isDevelopment,
  isProduction,
  isTest,
  server,
  database,
  client,
  firebase,
  admin,
  rateLimit,
  upload,
  pagination,
  ml,
  logging,
} = config;

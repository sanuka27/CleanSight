/**
 * Custom Application Error Classes
 * 
 * Centralized error handling for consistent API responses.
 */

import Sentry from '../config/sentry.js';
import logger from '../config/logger.js';

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request - Invalid input
 */
export class BadRequestError extends AppError {
  constructor(message = 'Bad request', errors = null) {
    super(message, 400, errors);
  }
}

/**
 * 401 Unauthorized - Authentication required
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
  }
}

/**
 * 403 Forbidden - Insufficient permissions
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
  }
}

/**
 * 404 Not Found - Resource not found
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

/**
 * 409 Conflict - Resource already exists or state conflict
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
  }
}

/**
 * 422 Unprocessable Entity - Validation error
 */
export class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = null) {
    super(message, 422, errors);
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests, please try again later') {
    super(message, 429);
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500);
  }
}

/**
 * 503 Service Unavailable - External service down
 */
export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503);
  }
}

/**
 * Async handler wrapper to catch errors in async route handlers
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Central error handling middleware
 * Place this at the end of your middleware chain
 */
export const errorHandler = (err, req, res, next) => {
  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let errors = err.errors || null;

  // Mongoose validation error
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    message = 'Validation failed';
    errors = {};
    for (const [field, detail] of Object.entries(err.errors)) {
      errors[field] = detail.message;
    }
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = field 
      ? `Duplicate value for ${field}` 
      : 'Duplicate key error';
  }

  // Firebase auth errors
  if (err.code && err.code.startsWith('auth/')) {
    statusCode = 401;
    const firebaseMessages = {
      'auth/id-token-expired': 'Token expired. Please log in again.',
      'auth/id-token-revoked': 'Token revoked. Please log in again.',
      'auth/invalid-id-token': 'Invalid token.',
      'auth/argument-error': 'Invalid authentication data.',
    };
    message = firebaseMessages[err.code] || 'Authentication failed';
  }

  // ── Structured logging & Sentry capture for server errors ────────────────
  if (statusCode >= 500) {
    logger.error('Unhandled server error', {
      message: err.message,
      statusCode,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      stack: err.stack,
    });

    // Report to Sentry — only non-operational (unexpected) errors
    if (!err.isOperational) {
      Sentry.captureException(err, {
        extra: {
          method: req.method,
          url: req.originalUrl,
          statusCode,
        },
      });
    }
  } else if (statusCode >= 400) {
    // Client errors are info-level — not Sentry-worthy, but useful for debugging
    logger.warn('Client error', {
      message: err.message,
      statusCode,
      method: req.method,
      url: req.originalUrl,
    });
  }

  // Send response
  const response = {
    success: false,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && statusCode >= 500 && {
      stack: err.stack,
    }),
  };

  res.status(statusCode).json(response);
};

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (req, res) => {
  logger.warn('Route not found', { method: req.method, url: req.originalUrl });
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};

export default {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  InternalError,
  ServiceUnavailableError,
  asyncHandler,
  errorHandler,
  notFoundHandler,
};

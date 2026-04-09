/**
 * Request Validation Middleware
 * 
 * Centralized validation utilities for common request patterns.
 * Uses simple validation without heavy libraries for smaller bundle size.
 */

import mongoose from 'mongoose';
import { REPORT_STATUS } from '../constants/reportStatus.js';
import { ALL_ROLES } from '../constants/roles.js';

// ─────────────────────────────────────────────────────────────────────
// Validation Error Class
// ─────────────────────────────────────────────────────────────────────

export class ValidationError extends Error {
  constructor(message, field = null, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.details = details;
    this.statusCode = 400;
  }
}

// ─────────────────────────────────────────────────────────────────────
// Core Validators
// ─────────────────────────────────────────────────────────────────────

/**
 * Validate that value is a valid MongoDB ObjectId
 */
export function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

/**
 * Validate email format
 */
export function isValidEmail(value) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof value === 'string' && emailRegex.test(value);
}

/**
 * Validate URL format
 */
export function isValidUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate coordinates [longitude, latitude]
 */
export function isValidCoordinates(coords) {
  if (!Array.isArray(coords) || coords.length !== 2) return false;
  const [lng, lat] = coords;
  return (
    typeof lng === 'number' &&
    typeof lat === 'number' &&
    lng >= -180 && lng <= 180 &&
    lat >= -90 && lat <= 90
  );
}

/**
 * Validate bounding box [west, south, east, north]
 */
export function isValidBbox(bbox) {
  if (!Array.isArray(bbox) || bbox.length !== 4) return false;
  const [west, south, east, north] = bbox;
  return (
    typeof west === 'number' &&
    typeof south === 'number' &&
    typeof east === 'number' &&
    typeof north === 'number' &&
    west >= -180 && west <= 180 &&
    east >= -180 && east <= 180 &&
    south >= -90 && south <= 90 &&
    north >= -90 && north <= 90 &&
    west <= east &&
    south <= north
  );
}

/**
 * Validate ISO date string
 */
export function isValidISODate(value) {
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Validate enum value
 */
export function isValidEnum(value, validValues) {
  return validValues.includes(value);
}

// ─────────────────────────────────────────────────────────────────────
// Schema-like Validator Builder
// ─────────────────────────────────────────────────────────────────────

/**
 * Create a validator function from a schema definition.
 * 
 * @example
 * const validateCreateReport = createValidator({
 *   imageUrl: { type: 'url', required: true },
 *   description: { type: 'string', required: true, maxLength: 500 },
 *   location: { type: 'coordinates', required: true },
 *   wasteType: { type: 'enum', values: ['general', 'recyclable'] },
 * });
 */
export function createValidator(schema) {
  return (data, options = {}) => {
    const errors = [];
    const sanitized = {};
    const strict = options.strict !== false;

    for (const [field, rules] of Object.entries(schema)) {
      const value = data?.[field];
      const isPresent = value !== undefined && value !== null && value !== '';

      // Required check
      if (rules.required && !isPresent) {
        errors.push({ field, message: `${field} is required` });
        continue;
      }

      // Skip optional fields that are not present
      if (!isPresent) continue;

      // Type validation
      let valid = true;
      let sanitizedValue = value;

      switch (rules.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push({ field, message: `${field} must be a string` });
            valid = false;
          } else {
            sanitizedValue = value.trim();
            if (rules.minLength && sanitizedValue.length < rules.minLength) {
              errors.push({ field, message: `${field} must be at least ${rules.minLength} characters` });
              valid = false;
            }
            if (rules.maxLength && sanitizedValue.length > rules.maxLength) {
              errors.push({ field, message: `${field} cannot exceed ${rules.maxLength} characters` });
              valid = false;
            }
            if (rules.pattern && !rules.pattern.test(sanitizedValue)) {
              errors.push({ field, message: rules.patternMessage || `${field} format is invalid` });
              valid = false;
            }
          }
          break;

        case 'number':
          const num = Number(value);
          if (isNaN(num)) {
            errors.push({ field, message: `${field} must be a number` });
            valid = false;
          } else {
            sanitizedValue = num;
            if (rules.min !== undefined && num < rules.min) {
              errors.push({ field, message: `${field} must be at least ${rules.min}` });
              valid = false;
            }
            if (rules.max !== undefined && num > rules.max) {
              errors.push({ field, message: `${field} cannot exceed ${rules.max}` });
              valid = false;
            }
            if (rules.integer && !Number.isInteger(num)) {
              errors.push({ field, message: `${field} must be an integer` });
              valid = false;
            }
          }
          break;

        case 'boolean':
          if (typeof value === 'boolean') {
            sanitizedValue = value;
          } else if (value === 'true' || value === '1') {
            sanitizedValue = true;
          } else if (value === 'false' || value === '0') {
            sanitizedValue = false;
          } else {
            errors.push({ field, message: `${field} must be a boolean` });
            valid = false;
          }
          break;

        case 'enum':
          if (!rules.values.includes(value)) {
            errors.push({ 
              field, 
              message: `${field} must be one of: ${rules.values.join(', ')}` 
            });
            valid = false;
          }
          break;

        case 'objectId':
          if (!isValidObjectId(value)) {
            errors.push({ field, message: `${field} must be a valid ID` });
            valid = false;
          }
          break;

        case 'email':
          if (!isValidEmail(value)) {
            errors.push({ field, message: `${field} must be a valid email` });
            valid = false;
          } else {
            sanitizedValue = value.toLowerCase().trim();
          }
          break;

        case 'url':
          if (!isValidUrl(value)) {
            errors.push({ field, message: `${field} must be a valid URL` });
            valid = false;
          }
          break;

        case 'date':
          if (!isValidISODate(value)) {
            errors.push({ field, message: `${field} must be a valid date` });
            valid = false;
          } else {
            sanitizedValue = new Date(value);
          }
          break;

        case 'coordinates':
          if (!isValidCoordinates(value)) {
            errors.push({ 
              field, 
              message: `${field} must be valid [longitude, latitude] coordinates` 
            });
            valid = false;
          }
          break;

        case 'bbox':
          if (!isValidBbox(value)) {
            errors.push({ 
              field, 
              message: `${field} must be a valid bounding box [west, south, east, north]` 
            });
            valid = false;
          }
          break;

        case 'array':
          if (!Array.isArray(value)) {
            errors.push({ field, message: `${field} must be an array` });
            valid = false;
          } else {
            if (rules.minLength && value.length < rules.minLength) {
              errors.push({ field, message: `${field} must have at least ${rules.minLength} items` });
              valid = false;
            }
            if (rules.maxLength && value.length > rules.maxLength) {
              errors.push({ field, message: `${field} cannot have more than ${rules.maxLength} items` });
              valid = false;
            }
            // Validate each item if itemType is specified
            if (rules.itemType === 'objectId') {
              const invalidItems = value.filter(v => !isValidObjectId(v));
              if (invalidItems.length > 0) {
                errors.push({ field, message: `${field} contains invalid IDs` });
                valid = false;
              }
            }
          }
          break;
      }

      if (valid) {
        sanitized[field] = sanitizedValue;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: sanitized,
    };
  };
}

// ─────────────────────────────────────────────────────────────────────
// Pre-built Validators
// ─────────────────────────────────────────────────────────────────────

/**
 * Validate report creation payload
 */
export const validateCreateReport = createValidator({
  imageUrl: { type: 'url', required: true },
  description: { type: 'string', required: true, maxLength: 500 },
  title: { type: 'string', required: false, maxLength: 120 },
  wasteType: { 
    type: 'enum', 
    required: false, 
    values: ['general', 'recyclable', 'organic', 'construction', 'hazardous'] 
  },
  urgency: { type: 'enum', required: false, values: ['low', 'medium', 'high'] },
});

/**
 * Validate report status update
 */
export const validateStatusUpdate = createValidator({
  status: { type: 'enum', required: true, values: Object.values(REPORT_STATUS) },
  rejectionReason: { type: 'string', required: false, maxLength: 500 },
});

/**
 * Validate pagination params
 */
export const validatePagination = createValidator({
  page: { type: 'number', required: false, min: 1, integer: true },
  limit: { type: 'number', required: false, min: 1, max: 100, integer: true },
});

/**
 * Validate date range params
 */
export const validateDateRange = createValidator({
  from: { type: 'date', required: false },
  to: { type: 'date', required: false },
  range: { type: 'enum', required: false, values: ['7d', '30d', '90d', 'custom'] },
});

/**
 * Validate user role update
 */
export const validateRoleUpdate = createValidator({
  role: { type: 'enum', required: true, values: ALL_ROLES },
});

// ─────────────────────────────────────────────────────────────────────
// Middleware Factory
// ─────────────────────────────────────────────────────────────────────

/**
 * Create Express middleware from a validator function.
 * 
 * @param {Function} validator - Validator function created by createValidator
 * @param {string} source - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware
 * 
 * @example
 * router.post('/reports', validate(validateCreateReport, 'body'), handler);
 */
export function validate(validator, source = 'body') {
  return (req, res, next) => {
    const data = req[source];
    const result = validator(data);

    if (!result.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: result.errors,
      });
    }

    // Attach sanitized data
    req.validated = req.validated || {};
    req.validated[source] = result.data;

    next();
  };
}

/**
 * Validate request param is a valid ObjectId
 */
export function validateParamId(paramName = 'id') {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: `${paramName} parameter is required`,
      });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName}`,
      });
    }

    next();
  };
}

export default {
  ValidationError,
  isValidObjectId,
  isValidEmail,
  isValidUrl,
  isValidCoordinates,
  isValidBbox,
  isValidISODate,
  isValidEnum,
  createValidator,
  validateCreateReport,
  validateStatusUpdate,
  validatePagination,
  validateDateRange,
  validateRoleUpdate,
  validate,
  validateParamId,
};

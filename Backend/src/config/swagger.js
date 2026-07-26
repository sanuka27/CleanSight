/**
 * swagger.js
 *
 * Central OpenAPI / Swagger configuration for CleanSight.
 *
 * Generates the OpenAPI 3.0 specification from JSDoc @swagger annotations
 * scattered across the route files, and returns the configured middleware
 * for swagger-ui-express so that server.js can mount it with a single import.
 *
 * Portal URL: GET /api/docs
 * Raw JSON:   GET /api/docs.json
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ─── Resolve the routes directory relative to this config file ───────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
// swagger-jsdoc uses the 'glob' package internally which requires POSIX-style
// forward slashes even on Windows. Replace any backslashes produced by path.join.
const routesGlob = join(__dirname, '../routes/**/*.js').replace(/\\/g, '/');
const serverFile = join(__dirname, '../server.js').replace(/\\/g, '/');

// ─── OpenAPI definition ──────────────────────────────────────────────────────
const definition = {
  openapi: '3.0.3',
  info: {
    title: 'CleanSight API',
    version: '1.0.0',
    description: `
## CleanSight REST API

CleanSight is a civic waste-reporting platform that connects citizens,
volunteers, and municipal staff to track and resolve waste-dumping incidents.

### Authentication

All protected endpoints require a **Firebase ID token** sent as a Bearer
token in the \`Authorization\` header:

\`\`\`
Authorization: Bearer <firebase-id-token>
\`\`\`

Admin-only endpoints additionally accept the token via an **\`x-admin-key\`**
header (used by internal tooling) or a \`?token=\` query parameter (required
by the SSE activity-feed endpoint because the browser's \`EventSource\` API
does not support custom headers).

### Roles

| Role       | Description                                                  |
|------------|--------------------------------------------------------------|
| \`citizen\`  | Can submit reports and view their own data.                  |
| \`volunteer\`| Can claim and resolve reports; sees global stats.            |
| \`staff\`    | Can assign reports and manage volunteers; triage access.     |
| \`admin\`    | Full platform access including user management and audit log.|

### Rate Limits

Several endpoints are rate-limited per IP. Limits are noted in the
individual endpoint descriptions.
    `.trim(),
    contact: {
      name: 'CleanSight Team',
      url:  'https://github.com/sanuka27/CleanSight',
    },
    license: {
      name: 'MIT',
      url:  'https://opensource.org/licenses/MIT',
    },
  },

  // ─── Servers ─────────────────────────────────────────────────────────────
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local development server',
    },
    {
      url: 'https://your-production-domain.com',
      description: 'Production server',
    },
  ],

  // ─── Security Schemes ────────────────────────────────────────────────────
  components: {
    securitySchemes: {
      BearerAuth: {
        type:         'http',
        scheme:       'bearer',
        bearerFormat: 'Firebase JWT',
        description:  'Firebase ID token obtained via Firebase Authentication SDK.',
      },
      AdminKey: {
        type: 'apiKey',
        in:   'header',
        name: 'x-admin-key',
        description:
          'Internal admin API key. Required only for admin-only endpoints when not using BearerAuth.',
      },
    },

    // ─── Shared Response Schemas ──────────────────────────────────────────
    schemas: {
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string',  example: 'A descriptive error message' },
        },
        required: ['success', 'message'],
      },
      ValidationError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          errors: {
            type: 'object',
            additionalProperties: { type: 'string' },
            example: { email: 'Please provide a valid email address.' },
          },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page:  { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          pages: { type: 'integer', example: 5 },
        },
      },
      UserProfile: {
        type: 'object',
        properties: {
          id:                { type: 'string', example: '64fa1b2c3d4e5f6a7b8c9d0e' },
          firebaseUid:       { type: 'string', example: 'abc123xyz' },
          name:              { type: 'string', example: 'Jane Doe' },
          email:             { type: 'string', format: 'email', example: 'jane@example.com' },
          role:              { type: 'string', enum: ['citizen', 'volunteer', 'staff', 'admin'] },
          avatar:            { type: 'string', format: 'uri', nullable: true },
          phone:             { type: 'string', nullable: true },
          isVerified:        { type: 'boolean' },
          reportsSubmitted:  { type: 'integer' },
          cleanupsCompleted: { type: 'integer' },
          createdAt:         { type: 'string', format: 'date-time' },
          updatedAt:         { type: 'string', format: 'date-time' },
        },
      },
      Report: {
        type: 'object',
        properties: {
          _id:          { type: 'string', example: '64fa1b2c3d4e5f6a7b8c9d0e' },
          firebaseUid:  { type: 'string', example: 'abc123xyz' },
          title:        { type: 'string', nullable: true, example: 'Illegal dumping near park' },
          description:  { type: 'string', example: 'Large pile of construction debris' },
          imageUrl:     { type: 'string', format: 'uri' },
          location: {
            type: 'object',
            properties: {
              type:        { type: 'string', example: 'Point' },
              coordinates: {
                type:    'array',
                items:   { type: 'number' },
                example: [80.2707, 13.0827],
              },
            },
          },
          wasteType:  { type: 'string', enum: ['general', 'recyclable', 'organic', 'construction', 'hazardous'] },
          urgency:    { type: 'string', enum: ['low', 'medium', 'high'] },
          status: {
            type: 'string',
            enum: ['pending', 'verified', 'assigned', 'in_progress', 'resolved', 'rejected'],
          },
          assignedTo:         { type: 'string', nullable: true },
          resolvedAt:         { type: 'string', format: 'date-time', nullable: true },
          resolutionImageUrl: { type: 'string', format: 'uri', nullable: true },
          aiReviewStatus:     { type: 'string', enum: ['pending', 'approved', 'rejected', 'review'] },
          createdAt:          { type: 'string', format: 'date-time' },
          updatedAt:          { type: 'string', format: 'date-time' },
        },
      },
      VolunteerProfile: {
        type: 'object',
        properties: {
          _id:  { type: 'string' },
          user: {
            type: 'object',
            properties: {
              name:   { type: 'string' },
              email:  { type: 'string', format: 'email' },
              avatar: { type: 'string', format: 'uri', nullable: true },
            },
          },
          bio:            { type: 'string', nullable: true },
          skills:         { type: 'array', items: { type: 'string' } },
          availability:   { type: 'string', enum: ['weekdays', 'weekends', 'flexible', 'evenings'] },
          preferredAreas: { type: 'array', items: { type: 'string' } },
          isActive:       { type: 'boolean' },
          stats: {
            type: 'object',
            properties: {
              totalCleanups:   { type: 'integer' },
              reportsResolved: { type: 'integer' },
              hoursVolunteered: { type: 'number' },
              rating:          { type: 'number' },
            },
          },
        },
      },
      NotificationPreferences: {
        type: 'object',
        properties: {
          push:  { type: 'boolean', example: true },
          email: { type: 'boolean', example: true },
        },
      },
      ContactMessage: {
        type: 'object',
        properties: {
          _id:       { type: 'string' },
          name:      { type: 'string' },
          email:     { type: 'string', format: 'email' },
          message:   { type: 'string' },
          status:    { type: 'string', enum: ['new', 'read', 'replied'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AnalyticsSummary: {
        type: 'object',
        properties: {
          range: {
            type: 'object',
            properties: {
              from: { type: 'string', format: 'date-time' },
              to:   { type: 'string', format: 'date-time' },
            },
          },
          totals: {
            type: 'object',
            properties: {
              total:      { type: 'integer' },
              pending:    { type: 'integer' },
              verified:   { type: 'integer' },
              assigned:   { type: 'integer' },
              inProgress: { type: 'integer' },
              resolved:   { type: 'integer' },
              rejected:   { type: 'integer' },
            },
          },
          rates: {
            type: 'object',
            properties: {
              resolutionRate: { type: 'number' },
              assignmentRate: { type: 'number' },
            },
          },
        },
      },
    },

    // ─── Shared Parameters ────────────────────────────────────────────────
    parameters: {
      PageParam: {
        name:        'page',
        in:          'query',
        description: 'Page number (1-indexed)',
        schema:      { type: 'integer', minimum: 1, default: 1 },
      },
      LimitParam: {
        name:        'limit',
        in:          'query',
        description: 'Number of items per page',
        schema:      { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      },
      DateFromParam: {
        name:        'from',
        in:          'query',
        description: 'Start date (ISO 8601)',
        schema:      { type: 'string', format: 'date-time' },
      },
      DateToParam: {
        name:        'to',
        in:          'query',
        description: 'End date (ISO 8601)',
        schema:      { type: 'string', format: 'date-time' },
      },
      ReportIdParam: {
        name:        'id',
        in:          'path',
        required:    true,
        description: 'MongoDB ObjectId of the report',
        schema:      { type: 'string', example: '64fa1b2c3d4e5f6a7b8c9d0e' },
      },
    },

    // ─── Shared Response Objects ──────────────────────────────────────────
    responses: {
      Unauthorized: {
        description: 'Missing or invalid authentication token',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { success: false, message: 'Unauthorized' },
          },
        },
      },
      Forbidden: {
        description: 'Authenticated but insufficient role/permissions',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { success: false, message: 'Forbidden' },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { success: false, message: 'Not found' },
          },
        },
      },
      InternalServerError: {
        description: 'Unexpected server error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { success: false, message: 'Internal server error' },
          },
        },
      },
      TooManyRequests: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { success: false, message: 'Too many requests, please try again later.' },
          },
        },
      },
    },
  },

  // ─── Global security (overridable per-operation) ──────────────────────────
  security: [{ BearerAuth: [] }],

  // ─── Tag groups (shown in sidebar) ───────────────────────────────────────
  tags: [
    { name: 'Health',         description: 'Service health and status checks' },
    { name: 'Auth',           description: 'Firebase-backed user registration and profile management' },
    { name: 'Reports',        description: 'Waste report lifecycle — submit, list, assign, and resolve' },
    { name: 'Volunteers',     description: 'Volunteer profiles, leaderboard, and task claiming' },
    { name: 'Dashboard',      description: 'Role-specific dashboard aggregation endpoints' },
    { name: 'Analytics',      description: 'Aggregate analytics: status breakdown, performance KPIs, volunteer stats' },
    { name: 'ML Analytics',   description: 'Machine-learning model performance and confidence metrics' },
    { name: 'Notifications',  description: 'FCM device-token management and notification preferences' },
    { name: 'Contact',        description: 'Public contact form submission' },
    { name: 'Admin',          description: 'Admin-only platform management (users, reports, audit log, settings)' },
    { name: 'Public',         description: 'Unauthenticated endpoints for city-level public statistics' },
  ],
};

// ─── swagger-jsdoc options ────────────────────────────────────────────────────
const options = {
  definition,
  // Scan all route files + server.js for @openapi / @swagger JSDoc annotations
  apis: [routesGlob, serverFile],
};

// ─── Generate the OpenAPI spec ────────────────────────────────────────────────
export const swaggerSpec = swaggerJsdoc(options);

// ─── swagger-ui-express middleware options ────────────────────────────────────
const uiOptions = {
  customCss: `
    /* CleanSight brand colours */
    :root {
      --primary: #16a34a;
      --primary-dark: #15803d;
    }
    .swagger-ui .topbar { background: #0f172a; }
    .swagger-ui .topbar .download-url-wrapper { display: none; }
    .swagger-ui .info .title { color: #0f172a; }
    .swagger-ui .btn.authorize { border-color: var(--primary); color: var(--primary); }
    .swagger-ui .btn.authorize svg { fill: var(--primary); }
    .swagger-ui .opblock.opblock-get    .opblock-summary-method { background: #2563eb; }
    .swagger-ui .opblock.opblock-post   .opblock-summary-method { background: var(--primary); }
    .swagger-ui .opblock.opblock-put    .opblock-summary-method { background: #d97706; }
    .swagger-ui .opblock.opblock-patch  .opblock-summary-method { background: #7c3aed; }
    .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #dc2626; }
  `,
  customSiteTitle: 'CleanSight API Docs',
  // Show model examples expanded by default, collapse all operations
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: false, // keep safe in production — users can enable per-op
    docExpansion: 'none',
    defaultModelsExpandDepth: 2,
    tagsSorter: 'alpha',
  },
};

/**
 * Configured swagger-ui-express middleware pair.
 *
 * Usage in server.js:
 *   import { swaggerServe, swaggerSetup } from './config/swagger.js';
 *   app.use('/api/docs', swaggerServe, swaggerSetup);
 */
export const swaggerServe = swaggerUi.serve;
export const swaggerSetup = swaggerUi.setup(swaggerSpec, uiOptions);

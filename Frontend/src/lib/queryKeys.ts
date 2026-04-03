/**
 * React Query Key Factory
 * Centralized query key definitions for consistent caching and invalidation.
 */

export const queryKeys = {
  // Auth / User
  auth: {
    all: ['auth'] as const,
    me: () => [...queryKeys.auth.all, 'me'] as const,
  },

  // Dashboard
  dashboard: {
    all: ['dashboard'] as const,
    citizen: () => [...queryKeys.dashboard.all, 'citizen'] as const,
    volunteer: () => [...queryKeys.dashboard.all, 'volunteer'] as const,
    staff: () => [...queryKeys.dashboard.all, 'staff'] as const,
    admin: () => [...queryKeys.dashboard.all, 'admin'] as const,
  },

  // Reports
  reports: {
    all: ['reports'] as const,
    lists: () => [...queryKeys.reports.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.reports.lists(), filters] as const,
    myReports: () => [...queryKeys.reports.all, 'my'] as const,
    mapReports: (filters?: Record<string, unknown>) =>
      [...queryKeys.reports.all, 'map', filters] as const,
    detail: (id: string) => [...queryKeys.reports.all, 'detail', id] as const,
  },

  // Admin
  admin: {
    all: ['admin'] as const,
    reports: {
      all: () => [...queryKeys.admin.all, 'reports'] as const,
      list: (filters?: Record<string, unknown>) =>
        [...queryKeys.admin.reports.all(), 'list', filters] as const,
      detail: (id: string) =>
        [...queryKeys.admin.reports.all(), 'detail', id] as const,
      map: (filters?: Record<string, unknown>) =>
        [...queryKeys.admin.reports.all(), 'map', filters] as const,
      categoryQueue: (filters?: Record<string, unknown>) =>
        [...queryKeys.admin.reports.all(), 'category-queue', filters] as const,
    },
    volunteers: {
      all: () => [...queryKeys.admin.all, 'volunteers'] as const,
      list: (filters?: Record<string, unknown>) =>
        [...queryKeys.admin.volunteers.all(), 'list', filters] as const,
      detail: (uid: string) =>
        [...queryKeys.admin.volunteers.all(), 'detail', uid] as const,
    },
    users: {
      all: () => [...queryKeys.admin.all, 'users'] as const,
      list: (filters?: Record<string, unknown>) =>
        [...queryKeys.admin.users.all(), 'list', filters] as const,
      detail: (id: string) =>
        [...queryKeys.admin.users.all(), 'detail', id] as const,
    },
    analytics: {
      all: () => [...queryKeys.admin.all, 'analytics'] as const,
      overview: (range?: string, from?: string, to?: string) =>
        [...queryKeys.admin.analytics.all(), 'overview', { range, from, to }] as const,
      trends: (range?: string, from?: string, to?: string) =>
        [...queryKeys.admin.analytics.all(), 'trends', { range, from, to }] as const,
    },
    auditLogs: {
      all: () => [...queryKeys.admin.all, 'audit-logs'] as const,
      list: (filters?: Record<string, unknown>) =>
        [...queryKeys.admin.auditLogs.all(), 'list', filters] as const,
    },
    documents: {
      all: () => [...queryKeys.admin.all, 'documents'] as const,
      list: (category?: string) =>
        [...queryKeys.admin.documents.all(), 'list', category] as const,
    },
    settings: () => [...queryKeys.admin.all, 'settings'] as const,
  },

  // Analytics (non-admin)
  analytics: {
    all: ['analytics'] as const,
    summary: (params?: Record<string, unknown>) =>
      [...queryKeys.analytics.all, 'summary', params] as const,
    performance: (params?: Record<string, unknown>) =>
      [...queryKeys.analytics.all, 'performance', params] as const,
    volunteers: (params?: Record<string, unknown>) =>
      [...queryKeys.analytics.all, 'volunteers', params] as const,
  },

  // ML Analytics
  mlAnalytics: {
    all: ['ml-analytics'] as const,
    summary: (params?: Record<string, unknown>) =>
      [...queryKeys.mlAnalytics.all, 'summary', params] as const,
    phase1: (params?: Record<string, unknown>) =>
      [...queryKeys.mlAnalytics.all, 'phase1', params] as const,
    phase2: (params?: Record<string, unknown>) =>
      [...queryKeys.mlAnalytics.all, 'phase2', params] as const,
    trends: (params?: Record<string, unknown>) =>
      [...queryKeys.mlAnalytics.all, 'trends', params] as const,
    weakPoints: (params?: Record<string, unknown>) =>
      [...queryKeys.mlAnalytics.all, 'weak-points', params] as const,
    confidenceDistribution: (params?: Record<string, unknown>) =>
      [...queryKeys.mlAnalytics.all, 'confidence-distribution', params] as const,
  },
} as const;

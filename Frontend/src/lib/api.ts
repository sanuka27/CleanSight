import { auth } from "./firebase";
import type {
  AnalyticsQueryParams,
  SummaryResponse,
  PerformanceResponse,
  VolunteerAnalyticsResponse,
} from "@/types/analytics";
import type {
  CitizenDashboardResponse,
  VolunteerDashboardResponse,
  StaffDashboardResponse,
  AdminDashboardResponse,
  DashboardMeResponse,
} from "@/types/dashboard";
import type { MapReportQueryParams, MapReportMarker, BBox } from "@/types/map";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

/**
 * Custom error thrown by ApiClient when a request returns a non-2xx status.
 * Exposes the HTTP `status` so callers can branch on status codes (e.g. 404)
 * instead of fragile string matching on `message`.
 */
export class ApiError extends Error {
  status: number;
  details: Record<string, unknown> | null;
  errors?: unknown;
  constructor(message: string, status: number, details?: Record<string, unknown> | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details ?? null;
    this.errors = details?.errors;
  }
}

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async getAuthToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;

    try {
      const token = await user.getIdToken();
      return token;
    } catch (error) {
      console.error("Error getting auth token:", error);
      return null;
    }
  }

  public async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { requiresAuth = true, headers = {}, ...restOptions } = options;

    const config: RequestInit = {
      ...restOptions,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    // Attach Firebase ID token if authentication is required
    if (requiresAuth) {
      const token = await this.getAuthToken();
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, config);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({
        message: response.statusText,
      }));
      const safePayload = (payload && typeof payload === "object") ? payload : { message: response.statusText };
      throw new ApiError(
        (safePayload as { message?: string }).message || "API request failed",
        response.status,
        safePayload as Record<string, unknown>
      );
    }

    return response.json();
  }

  // Auth endpoints
  async register(data: {
    name: string;
    email: string;
    role: string;
  }): Promise<any> {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
      requiresAuth: true,
    });
  }

  async getMe(): Promise<any> {
    return this.request("/api/auth/me", {
      method: "GET",
      requiresAuth: true,
    });
  }

  // Health check (no auth required)
  async healthCheck(): Promise<{ status: string; message: string }> {
    return this.request("/api/health", {
      method: "GET",
      requiresAuth: false,
    });
  }

  // Report endpoints
  async createReport(data: {
    imageUrl: string;
    description: string;
    location: { lat: number; lng: number };
    wasteType?: string;
    urgency?: string;
  }): Promise<any> {
    return this.request("/api/reports", {
      method: "POST",
      body: JSON.stringify(data),
      requiresAuth: true,
    });
  }

  async getMyReports(): Promise<any> {
    return this.request("/api/reports/my", {
      method: "GET",
      requiresAuth: true,
    });
  }

  async getReports(): Promise<any> {
    return this.request("/api/reports", {
      method: "GET",
      requiresAuth: true,
    });
  }

  /**
   * List reports with map-ready filters: status, bbox, near, mine.
   */
  async listReportsForMap(params?: MapReportQueryParams): Promise<{
    success: boolean;
    count: number;
    data: MapReportMarker[];
  }> {
    const qs = new URLSearchParams();
    if (params?.status && params.status.length > 0) {
      qs.set("status", params.status.join(","));
    }
    if (params?.bbox) {
      qs.set("bbox", params.bbox.join(","));
    }
    if (params?.near) {
      qs.set("near", `${params.near.lat},${params.near.lng},${params.near.radiusKm}`);
    }
    if (params?.mine) {
      qs.set("mine", "true");
    }
    const queryStr = qs.toString();
    return this.request(`/api/reports${queryStr ? `?${queryStr}` : ""}`, {
      method: "GET",
      requiresAuth: true,
    });
  }

  /**
   * Get a single report by ID (full details).
   */
  async getReportById(id: string): Promise<{ success: boolean; data: any }> {
    return this.request(`/api/reports/${id}`, {
      method: "GET",
      requiresAuth: true,
    });
  }

  // Report lifecycle endpoints
  async assignSelf(reportId: string): Promise<any> {
    return this.request(`/api/reports/${reportId}/assign-self`, {
      method: "PATCH",
      requiresAuth: true,
    });
  }

  async assignReport(reportId: string, volunteerUid: string): Promise<any> {
    return this.request(`/api/reports/${reportId}/assign`, {
      method: "PATCH",
      body: JSON.stringify({ volunteerUid }),
      requiresAuth: true,
    });
  }

  async updateReportStatus(
    reportId: string,
    status: string,
    options?: { resolutionImageUrl?: string }
  ): Promise<any> {
    return this.request(`/api/reports/${reportId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, ...options }),
      requiresAuth: true,
    });
  }

  async getVolunteers(): Promise<any> {
    return this.request("/api/reports/volunteers", {
      method: "GET",
      requiresAuth: true,
    });
  }

  // ── Analytics endpoints ──────────────────────────────────────────

  private buildAnalyticsQuery(params?: AnalyticsQueryParams): string {
    if (!params) return "";
    const qs = new URLSearchParams();
    if (params.preset) qs.set("preset", params.preset);
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    const str = qs.toString();
    return str ? `?${str}` : "";
  }

  async getAnalyticsSummary(
    params?: AnalyticsQueryParams
  ): Promise<SummaryResponse> {
    return this.request(`/api/analytics/summary${this.buildAnalyticsQuery(params)}`, {
      method: "GET",
      requiresAuth: true,
    });
  }

  async getAnalyticsPerformance(
    params?: AnalyticsQueryParams
  ): Promise<PerformanceResponse> {
    return this.request(
      `/api/analytics/performance${this.buildAnalyticsQuery(params)}`,
      { method: "GET", requiresAuth: true }
    );
  }

  async getVolunteerAnalytics(
    params?: AnalyticsQueryParams
  ): Promise<VolunteerAnalyticsResponse> {
    return this.request(
      `/api/analytics/volunteers${this.buildAnalyticsQuery(params)}`,
      { method: "GET", requiresAuth: true }
    );
  }

  // ── Dashboard endpoints ────────────────────────────────────────────

  async getDashboardMe(): Promise<DashboardMeResponse> {
    return this.request("/api/dashboard/me", {
      method: "GET",
      requiresAuth: true,
    });
  }

  async getCitizenDashboard(): Promise<CitizenDashboardResponse> {
    return this.request("/api/dashboard/citizen", {
      method: "GET",
      requiresAuth: true,
    });
  }

  async getVolunteerDashboard(): Promise<VolunteerDashboardResponse> {
    return this.request("/api/dashboard/volunteer", {
      method: "GET",
      requiresAuth: true,
    });
  }

  async getStaffDashboard(): Promise<StaffDashboardResponse> {
    return this.request("/api/dashboard/staff", {
      method: "GET",
      requiresAuth: true,
    });
  }

  async getAdminDashboard(): Promise<AdminDashboardResponse> {
    return this.request("/api/dashboard/admin", {
      method: "GET",
      requiresAuth: true,
    });
  }

  // ── Public endpoints ──────────────────────────────────────────────
  
  async getPublicStats(): Promise<any> {
    return this.request("/api/public/stats", {
      method: "GET",
      requiresAuth: false,
    });
  }


  // ── Notification endpoints ────────────────────────────────────────

  async registerFcmToken(token: string): Promise<{ success: boolean }> {
    return this.request('/api/notifications/fcm-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
      requiresAuth: true,
    });
  }

  async deregisterFcmToken(token: string): Promise<{ success: boolean }> {
    return this.request('/api/notifications/fcm-token', {
      method: 'DELETE',
      body: JSON.stringify({ token }),
      requiresAuth: true,
    });
  }

  async getNotificationPreferences(): Promise<{ success: boolean; data: { push: boolean; email: boolean } }> {
    return this.request('/api/notifications/preferences', {
      method: 'GET',
      requiresAuth: true,
    });
  }

  async updateNotificationPreferences(prefs: { push?: boolean; email?: boolean }): Promise<{ success: boolean; data: { push: boolean; email: boolean } }> {
    return this.request('/api/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify(prefs),
      requiresAuth: true,
    });
  }

  /**
   * Generic admin request - for use by admin services
   * Prefixes path with /api/admin automatically
   */
  async adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
    return this.request(`/api/admin${path}`, {
      ...options,
      requiresAuth: true,
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
export default api;

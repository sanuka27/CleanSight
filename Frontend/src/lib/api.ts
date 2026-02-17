import { auth } from "./firebase";
import type {
  AnalyticsQueryParams,
  SummaryResponse,
  PerformanceResponse,
  VolunteerAnalyticsResponse,
} from "@/types/analytics";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

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

  private async request<T>(
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
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }));
      throw new Error(error.message || "API request failed");
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

  async updateReportStatus(reportId: string, status: string): Promise<any> {
    return this.request(`/api/reports/${reportId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
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
}

export const api = new ApiClient(API_BASE_URL);
export default api;

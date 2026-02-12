import { auth } from "./firebase";

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
}

export const api = new ApiClient(API_BASE_URL);
export default api;

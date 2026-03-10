import { auth } from "@/lib/firebase";
import type {
  AdminReport,
  AdminVolunteer,
  AdminAnalyticsOverview,
  TrendDataPoint,
  VolunteerPerformance,
  AdminDocument,
  SystemSettings,
  ReportFilters,
  PaginatedResponse,
  ReportStatus,
  DateRange,
  AuditLog,
  AuditLogFilters,
  AdminUser,
  AdminUserDetail,
  UserFilters,
  AppRole,
} from "@/types/admin";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

async function getToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  return user.getIdToken();
}

async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api/admin${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Admin API error ${res.status}`);
  }

  return res.json();
}

// ── Reports ─────────────────────────────────────────────────────────

export async function listAdminReports(
  filters: ReportFilters = {}
): Promise<PaginatedResponse<AdminReport>> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  });
  return adminFetch(`/reports?${params.toString()}`);
}

export async function getAdminReport(id: string): Promise<{ success: boolean; data: AdminReport }> {
  return adminFetch(`/reports/${id}`);
}

export async function updateReportStatus(
  id: string,
  status: ReportStatus,
  rejectionReason?: string
): Promise<{ success: boolean; data: AdminReport }> {
  return adminFetch(`/reports/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, rejectionReason }),
  });
}

export async function assignReportToVolunteer(
  id: string,
  volunteerUid: string
): Promise<{ success: boolean; data: AdminReport }> {
  return adminFetch(`/reports/${id}/assign`, {
    method: "PATCH",
    body: JSON.stringify({ volunteerUid }),
  });
}

export async function addReportNote(
  id: string,
  note: string
): Promise<{ success: boolean; data: AdminReport }> {
  return adminFetch(`/reports/${id}/note`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export async function exportReportsCsv(filters: {
  from?: string;
  to?: string;
  status?: string;
  wasteType?: string;
}): Promise<{ success: boolean; data: Record<string, unknown>[] }> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v) params.set(k, v);
  });
  return adminFetch(`/reports/export/csv?${params.toString()}`);
}

// ── Volunteers ──────────────────────────────────────────────────────

export async function listAdminVolunteers(params: {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}): Promise<PaginatedResponse<AdminVolunteer>> {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  });
  return adminFetch(`/volunteers?${q.toString()}`);
}

export async function getAdminVolunteer(uid: string): Promise<{
  success: boolean;
  data: {
    user: AdminVolunteer;
    profile: unknown;
    tasks: AdminReport[];
    stats: { total: number; resolved: number; inProgress: number; completionRate: number };
  };
}> {
  return adminFetch(`/volunteers/${uid}`);
}

// ── Analytics ───────────────────────────────────────────────────────

export async function getAdminOverview(
  range: DateRange = "7d",
  from?: string,
  to?: string
): Promise<{ success: boolean; data: AdminAnalyticsOverview }> {
  const params = new URLSearchParams({ range });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return adminFetch(`/analytics/overview?${params.toString()}`);
}

export async function getAdminTrends(
  range: DateRange = "30d",
  from?: string,
  to?: string
): Promise<{ success: boolean; data: TrendDataPoint[] }> {
  const params = new URLSearchParams({ range });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return adminFetch(`/analytics/trends?${params.toString()}`);
}

export async function getVolunteerPerformance(
  range: DateRange = "30d"
): Promise<{ success: boolean; data: VolunteerPerformance[] }> {
  return adminFetch(`/analytics/volunteer-performance?range=${range}`);
}

// ── Documents ───────────────────────────────────────────────────────

export async function listDocuments(category?: string): Promise<{
  success: boolean;
  data: AdminDocument[];
  pagination: { page: number; limit: number; total: number };
}> {
  const params = category ? `?category=${category}` : "";
  return adminFetch(`/documents${params}`);
}

export async function createDocument(doc: {
  title: string;
  url: string;
  fileType?: string;
  fileSize?: number;
  category?: string;
  description?: string;
}): Promise<{ success: boolean; data: AdminDocument }> {
  return adminFetch("/documents", {
    method: "POST",
    body: JSON.stringify(doc),
  });
}

export async function deleteDocument(id: string): Promise<{ success: boolean; message: string }> {
  return adminFetch(`/documents/${id}`, { method: "DELETE" });
}

// ── Settings ────────────────────────────────────────────────────────

export async function getSettings(): Promise<{ success: boolean; data: SystemSettings }> {
  return adminFetch("/settings");
}

export async function updateSettings(
  update: Partial<SystemSettings>
): Promise<{ success: boolean; data: SystemSettings }> {
  return adminFetch("/settings", {
    method: "PUT",
    body: JSON.stringify(update),
  });
}

// ── Audit Log ────────────────────────────────────────────────────────

export async function listAuditLogs(filters: AuditLogFilters = {}): Promise<PaginatedResponse<AuditLog>> {
  const q = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  });
  return adminFetch(`/audit-logs?${q.toString()}`);
}

export async function getAuditLog(id: string): Promise<{ success: boolean; data: AuditLog }> {
  return adminFetch(`/audit-logs/${id}`);
}

// ── User Management ──────────────────────────────────────────────────

export async function listAdminUsers(
  filters: UserFilters = {}
): Promise<PaginatedResponse<AdminUser>> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  });
  return adminFetch(`/users?${params.toString()}`);
}

export async function getAdminUserDetail(
  id: string
): Promise<{ success: boolean; data: AdminUserDetail }> {
  return adminFetch(`/users/${id}`);
}

export async function updateUserRole(
  id: string,
  role: AppRole
): Promise<{ success: boolean; data: AdminUser }> {
  return adminFetch(`/users/${id}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function updateUserSuspension(
  id: string,
  isSuspended: boolean,
  reason?: string
): Promise<{ success: boolean; data: AdminUser }> {
  return adminFetch(`/users/${id}/suspend`, {
    method: "PATCH",
    body: JSON.stringify({ isSuspended, reason }),
  });
}

export async function getAdminUserReports(
  id: string,
  page = 1,
  limit = 20,
  status?: string
): Promise<PaginatedResponse<AdminReport>> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set("status", status);
  return adminFetch(`/users/${id}/reports?${params.toString()}`);
}

export async function getAdminUserTasks(
  id: string,
  page = 1,
  limit = 20
): Promise<PaginatedResponse<AdminReport>> {
  return adminFetch(`/users/${id}/tasks?page=${page}&limit=${limit}`);
}

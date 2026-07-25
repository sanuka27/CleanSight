/**
 * useReports hook unit tests
 *
 * Mocks:
 *  - @/lib/api  → controls createReport / getMyReports / getReports / etc.
 *  - @/lib/upload → controls uploadImage
 *  - @/lib/queryKeys → real module (pure object, no side effects)
 *  - @tanstack/react-query → real QueryClient via wrapper
 *
 * Strategy:
 *  The hook uses useQueryClient() to invalidate caches, so every renderHook
 *  call is wrapped in a QueryClientProvider.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useReports } from "@/hooks/useReports";

// ── Mock external dependencies ─────────────────────────────────────────────────

vi.mock("@/lib/upload", () => ({
  uploadImage: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  default: {
    createReport: vi.fn(),
    getMyReports: vi.fn(),
    getReports: vi.fn(),
    assignSelf: vi.fn(),
    assignReport: vi.fn(),
    updateReportStatus: vi.fn(),
  },
}));

import { uploadImage } from "@/lib/upload";
import api from "@/lib/api";

// ── Helpers ────────────────────────────────────────────────────────────────────

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

const mockReport = {
  _id: "report-abc",
  firebaseUid: "user-uid",
  imageUrl: "https://example.com/img.jpg",
  description: "Waste on the road near the park",
  location: { lat: 19.076, lng: 72.8777 },
  wasteType: "general",
  urgency: "medium",
  status: "pending",
  assignedTo: null,
  createdAt: new Date().toISOString(),
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("useReports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── initial state ────────────────────────────────────────────────────────────

  it("initialises with isLoading=false and error=null", () => {
    const { result } = renderHook(() => useReports(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  // ── createReport ─────────────────────────────────────────────────────────────

  it("createReport: sets isLoading during execution and returns the report", async () => {
    const mockUpload = uploadImage as ReturnType<typeof vi.fn>;
    const mockCreate = api.createReport as ReturnType<typeof vi.fn>;

    mockUpload.mockResolvedValue("https://storage.example.com/img.jpg");
    mockCreate.mockResolvedValue({ success: true, data: mockReport });

    const { result } = renderHook(() => useReports(), { wrapper: createWrapper() });
    const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });

    let returnedReport: typeof mockReport | undefined;
    await act(async () => {
      returnedReport = await result.current.createReport(
        file,
        "Waste on the road near the park",
        { lat: 19.076, lng: 72.8777 },
        "general",
        "medium"
      );
    });

    expect(mockUpload).toHaveBeenCalledWith(file);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        imageUrl: "https://storage.example.com/img.jpg",
        description: "Waste on the road near the park",
        location: { lat: 19.076, lng: 72.8777 },
      })
    );
    expect(returnedReport).toEqual(mockReport);
    // isLoading should reset after completion
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("createReport: sets error and re-throws on upload failure", async () => {
    const mockUpload = uploadImage as ReturnType<typeof vi.fn>;
    mockUpload.mockRejectedValue(new Error("Upload failed"));

    const { result } = renderHook(() => useReports(), { wrapper: createWrapper() });
    const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });

    let caughtError: Error | null = null;
    await act(async () => {
      try {
        await result.current.createReport(
          file,
          "Waste on the road near the park",
          { lat: 19.076, lng: 72.8777 }
        );
      } catch (e) {
        caughtError = e as Error;
      }
    });

    expect(caughtError).not.toBeNull();
    expect((caughtError as Error).message).toBe("Upload failed");
    expect(result.current.error).toBe("Upload failed");
    expect(result.current.isLoading).toBe(false);
  });

  it("createReport: sets generic error for non-Error rejection", async () => {
    const mockUpload = uploadImage as ReturnType<typeof vi.fn>;
    mockUpload.mockRejectedValue("string error");

    const { result } = renderHook(() => useReports(), { wrapper: createWrapper() });
    const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });

    await act(async () => {
      try {
        await result.current.createReport(file, "At least 10 chars", { lat: 0, lng: 0 });
      } catch {
        // expected throw
      }
    });

    expect(result.current.error).toBe("Failed to create report");
  });

  // ── getMyReports ─────────────────────────────────────────────────────────────

  it("getMyReports: returns the data array on success", async () => {
    const mockGet = api.getMyReports as ReturnType<typeof vi.fn>;
    mockGet.mockResolvedValue({ success: true, data: [mockReport] });

    const { result } = renderHook(() => useReports(), { wrapper: createWrapper() });

    let reports: typeof mockReport[] | undefined;
    await act(async () => {
      reports = await result.current.getMyReports();
    });

    expect(reports).toEqual([mockReport]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("getMyReports: sets error and re-throws on API failure", async () => {
    const mockGet = api.getMyReports as ReturnType<typeof vi.fn>;
    mockGet.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useReports(), { wrapper: createWrapper() });

    await act(async () => {
      try {
        await result.current.getMyReports();
      } catch {
        // expected throw
      }
    });

    expect(result.current.error).toBe("Network error");
  });

  // ── updateReportStatus ────────────────────────────────────────────────────────

  it("updateReportStatus: calls api.updateReportStatus and returns updated report", async () => {
    const updatedReport = { ...mockReport, status: "assigned" };
    const mockUpdate = api.updateReportStatus as ReturnType<typeof vi.fn>;
    mockUpdate.mockResolvedValue({ success: true, data: updatedReport });

    const { result } = renderHook(() => useReports(), { wrapper: createWrapper() });

    let updated: typeof updatedReport | undefined;
    await act(async () => {
      updated = await result.current.updateReportStatus("report-abc", "assigned");
    });

    expect(mockUpdate).toHaveBeenCalledWith("report-abc", "assigned");
    expect(updated?.status).toBe("assigned");
  });

  it("updateReportStatus: sets error on API failure", async () => {
    const mockUpdate = api.updateReportStatus as ReturnType<typeof vi.fn>;
    mockUpdate.mockRejectedValue(new Error("Invalid transition"));

    const { result } = renderHook(() => useReports(), { wrapper: createWrapper() });

    await act(async () => {
      try {
        await result.current.updateReportStatus("report-abc", "resolved");
      } catch {
        // expected throw
      }
    });

    expect(result.current.error).toBe("Invalid transition");
  });

  // ── assignSelf ────────────────────────────────────────────────────────────────

  it("assignSelf: calls api.assignSelf with the report ID", async () => {
    const assignedReport = { ...mockReport, status: "assigned", assignedTo: "user-uid" };
    const mockAssign = api.assignSelf as ReturnType<typeof vi.fn>;
    mockAssign.mockResolvedValue({ success: true, data: assignedReport });

    const { result } = renderHook(() => useReports(), { wrapper: createWrapper() });

    let res: typeof assignedReport | undefined;
    await act(async () => {
      res = await result.current.assignSelf("report-abc");
    });

    expect(mockAssign).toHaveBeenCalledWith("report-abc");
    expect(res?.assignedTo).toBe("user-uid");
  });
});

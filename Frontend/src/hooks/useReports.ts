import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { uploadImage } from "@/lib/upload";
import { queryKeys } from "@/lib/queryKeys";

interface ReportLocation {
  lat: number;
  lng: number;
}

interface ReportData {
  imageUrl: string;
  description: string;
  location: ReportLocation;
  wasteType?: string;
  urgency?: string;
}

interface Report {
  _id: string;
  firebaseUid: string;
  imageUrl: string;
  description: string;
  location: ReportLocation;
  wasteType: string;
  urgency: string;
  status: string;
  assignedTo: string | null;
  createdAt: string;
}

interface ReportsResponse {
  success: boolean;
  count: number;
  data: Report[];
}

interface CreateReportResponse {
  success: boolean;
  data: Report;
}

export function useReports() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  /**
   * Create a new report.
   * Uploads the image to Firebase Storage, then sends report metadata to the API.
   */
  const createReport = async (
    file: File,
    description: string,
    location: ReportLocation,
    wasteType?: string,
    urgency?: string
  ): Promise<Report> => {
    setIsLoading(true);
    setError(null);

    try {
      // Upload image to Firebase Storage
      const imageUrl = await uploadImage(file);

      // Send report to backend
      const response = await api.createReport({
        imageUrl,
        description,
        location,
        wasteType,
        urgency,
      });

      // Keep report lists + dashboards in sync with the new report
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.refetchQueries({ queryKey: queryKeys.dashboard.all, type: "all" });

      return response.data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create report";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get the current user's reports.
   */
  const getMyReports = async (): Promise<Report[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getMyReports();
      return response.data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch reports";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get all reports (role-based: citizens see own, others see all).
   */
  const getReports = async (): Promise<Report[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getReports();
      return response.data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch reports";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Volunteer self-assigns a pending report.
   */
  const assignSelf = async (reportId: string): Promise<Report> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.assignSelf(reportId);

      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });

      return response.data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to assign report";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Staff/Admin assigns a report to a volunteer.
   */
  const assignReport = async (reportId: string, volunteerUid: string): Promise<Report> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.assignReport(reportId, volunteerUid);

      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });

      return response.data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to assign report";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update report status (with transition validation on backend).
   */
  const updateReportStatus = async (reportId: string, status: string): Promise<Report> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.updateReportStatus(reportId, status);

      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });

      return response.data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update status";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createReport,
    getMyReports,
    getReports,
    assignSelf,
    assignReport,
    updateReportStatus,
    isLoading,
    error,
  };
}

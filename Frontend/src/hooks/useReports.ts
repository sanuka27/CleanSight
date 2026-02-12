import { useState } from "react";
import api from "@/lib/api";
import { uploadImage } from "@/lib/upload";

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

  return {
    createReport,
    getMyReports,
    isLoading,
    error,
  };
}

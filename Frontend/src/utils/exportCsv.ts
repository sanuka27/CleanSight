/* ------------------------------------------------------------------ */
/*  CSV export utility — generates a CSV file from real report data    */
/* ------------------------------------------------------------------ */

import type { DashboardReport } from "@/types/dashboard";
import { WASTE_TYPE_LABELS, URGENCY_LABELS, getLatLng } from "@/utils/reportStatus";

/**
 * Convert an array of dashboard reports to a CSV string.
 */
function reportsToCsv(reports: DashboardReport[]): string {
  const headers = [
    "ID",
    "Title",
    "Description",
    "Status",
    "Waste Type",
    "Urgency",
    "Latitude",
    "Longitude",
    "Created At",
    "Updated At",
  ];

  const rows = reports.map((r) => {
    const loc = getLatLng(r.location);
    return [
      r._id,
      escapeCsvField(r.title || ""),
      escapeCsvField(r.description || ""),
      r.status,
      WASTE_TYPE_LABELS[r.wasteType] || r.wasteType,
      URGENCY_LABELS[r.urgency] || r.urgency,
      loc ? loc.lat.toFixed(6) : "",
      loc ? loc.lng.toFixed(6) : "",
      r.createdAt ? new Date(r.createdAt).toISOString() : "",
      r.updatedAt ? new Date(r.updatedAt).toISOString() : "",
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Escape a CSV field value (wrap in quotes if it contains commas, quotes, or newlines).
 */
function escapeCsvField(value: string): string {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Trigger a CSV download in the browser from report data.
 */
export function exportReportsCsv(
  reports: DashboardReport[],
  filename = "my-reports.csv"
): void {
  const csv = reportsToCsv(reports);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

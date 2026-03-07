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
    const fields = [
      r._id ?? "",
      r.title ?? "",
      r.description ?? "",
      r.status ?? "",
      WASTE_TYPE_LABELS[r.wasteType] || r.wasteType || "",
      URGENCY_LABELS[r.urgency] || r.urgency || "",
      loc ? loc.lat.toFixed(6) : "",
      loc ? loc.lng.toFixed(6) : "",
      r.createdAt ? new Date(r.createdAt).toISOString() : "",
      r.updatedAt ? new Date(r.updatedAt).toISOString() : "",
    ];
    return fields.map((value) => escapeCsvField(String(value))).join(",");
  });

  const headerLine = headers.map((h) => escapeCsvField(h)).join(",");
  return [headerLine, ...rows].join("\n");
}

/**
 * Escape a CSV field value (wrap in quotes if it contains commas, quotes, or newlines).
 */
function escapeCsvField(value: string): string {
  // Mitigate CSV formula injection for user-controlled fields
  let safe = value;
  if (/^[=+\-@\t\r]/.test(safe)) {
    safe = `'${safe}`;
  }
  if (
    safe.includes(",") ||
    safe.includes('"') ||
    safe.includes("\n") ||
    safe.includes("\r")
  ) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/**
 * Generic CSV export from any array of objects.
 * Column names are derived from the first object's keys.
 */
export function exportToCsv(
  data: Record<string, unknown>[],
  filename = "export"
): void {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => escapeCsvField(String(row[h] ?? ""))).join(",")
  );
  const csv = [headers.map(escapeCsvField).join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
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

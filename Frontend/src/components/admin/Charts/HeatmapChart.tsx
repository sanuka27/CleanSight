import { useMemo } from "react";
import { useAdminMapReportsQuery } from "@/hooks/useAdminQueries";
import { CleanSightMap } from "@/components/map/CleanSightMap";
import { MapHeatmapLayer } from "@/components/ui/map";
import { reportsToFeatureCollection } from "@/utils/geo";

interface HeatmapChartProps {
  dateFrom?: string;
  dateTo?: string;
}

export function HeatmapChart({ dateFrom, dateTo }: HeatmapChartProps) {
  const { data, isLoading } = useAdminMapReportsQuery({
    dateFrom,
    dateTo,
  });

  const reports = data?.data ?? [];
  const geojson = useMemo(() => reportsToFeatureCollection(reports), [reports]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!reports.length) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        No geographic data for selected period
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-border/60">
      <CleanSightMap mode="view" reports={[]} showUserLocation={false}>
        <MapHeatmapLayer data={geojson} />
      </CleanSightMap>
    </div>
  );
}

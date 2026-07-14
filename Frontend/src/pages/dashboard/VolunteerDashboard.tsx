import { useEffect, useState, useCallback, useRef } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useVolunteerDashboardQuery } from "@/hooks/useDashboardQueries";
import { useAssignSelfMutation, useUpdateReportStatusMutation } from "@/hooks/useReportsQueries";
import { useAuth } from "@/context/useAuth";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import type { DashboardReport } from "@/types/dashboard";
import type { LatLng, MapReportMarker } from "@/types/map";
import { DEFAULT_NEAR_RADIUS_KM } from "@/constants/map";

// Volunteer dashboard components
import { VolunteerDashboardHeader } from "@/components/volunteer/VolunteerDashboardHeader";
import { VolunteerStatsGrid } from "@/components/volunteer/VolunteerStatsGrid";
import { VolunteerBadgesPanel } from "@/components/volunteer/VolunteerBadgesPanel";
import { MyTasksBoard } from "@/components/volunteer/MyTasksBoard";
import { AvailableReportsFeed } from "@/components/volunteer/AvailableReportsFeed";
import { TaskDetailsModal } from "@/components/volunteer/TaskDetailsModal";
import { VolunteerMapDrawer } from "@/components/volunteer/VolunteerMapDrawer";
import { ResolveWithPhotoModal } from "@/components/volunteer/ResolveWithPhotoModal";

const VolunteerDashboard = () => {
  const { appUser } = useAuth();
  const { data, isLoading, isRefetching, error, refetch } = useVolunteerDashboardQuery();
  const assignSelfMutation = useAssignSelfMutation();
  const updateStatusMutation = useUpdateReportStatusMutation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Action loading: tracks which reportId is being mutated
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Task detail modal
  const [detailReport, setDetailReport] = useState<DashboardReport | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Resolve-with-photo modal
  const [resolveReport, setResolveReport] = useState<DashboardReport | null>(null);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);

  // Map drawer
  const [mapOpen, setMapOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [nearbyMapReports, setNearbyMapReports] = useState<MapReportMarker[]>([]);
  const [nearLoading, setNearLoading] = useState(false);
  const [routeTo, setRouteTo] = useState<LatLng | null>(null);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);

  // Tasks section ref for scroll
  const tasksRef = useRef<HTMLDivElement>(null);
  const badgeToastKeyRef = useRef<string>("");

  // Convert error to string for display
  const errorMessage = error instanceof Error ? error.message : error ? String(error) : null;

  // Show error toast
  useEffect(() => {
    if (errorMessage) {
      toast({
        title: "Failed to load dashboard",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [errorMessage, toast]);

  /* ── Data derivations ───────────────────────────────────────────── */
  const assignedToMe = data?.assignedToMe ?? [];
  const resolvedByMe = data?.resolvedByMe ?? [];
  const pendingNearby = data?.pendingNearby ?? [];
  const stats = data?.myStats ?? { assignedCount: 0, resolvedCount: 0 };
  const volunteerProfile = data?.volunteerProfile ?? null;
  const badges = volunteerProfile?.badges ?? [];
  const badgeCatalog = volunteerProfile?.badgeCatalog ?? [];
  const totalCleanups = volunteerProfile?.stats?.totalCleanups ?? 0;
  const volunteerName = appUser?.name?.split(" ")[0] ?? "Volunteer";
  const newlyEarnedBadges = data?.newlyEarnedBadges ?? [];

  useEffect(() => {
    if (newlyEarnedBadges.length === 0) return;
    const key = newlyEarnedBadges.map((badge) => badge.id || badge.name).join("|");
    if (badgeToastKeyRef.current === key) return;
    badgeToastKeyRef.current = key;

    const badgeNames = newlyEarnedBadges.map((badge) => badge.name).join(", ");
    const title = newlyEarnedBadges.length === 1 ? "Badge unlocked!" : "Badges unlocked!";
    const description = newlyEarnedBadges.length === 1
      ? `You earned ${badgeNames}.`
      : `You earned ${newlyEarnedBadges.length} badges: ${badgeNames}.`;

    toast({ title, description });
  }, [newlyEarnedBadges, toast]);

  /* ── Location helpers ───────────────────────────────────────────── */
  const fetchNearbyForMap = useCallback(async (loc: LatLng) => {
    setNearLoading(true);
    try {
      const res = await api.listReportsForMap({
        near: { lat: loc.lat, lng: loc.lng, radiusKm: DEFAULT_NEAR_RADIUS_KM },
        status: ["pending", "assigned"],
      });
      setNearbyMapReports(res.data);
    } catch {
      // silent — dashboard reports still show on map
    } finally {
      setNearLoading(false);
    }
  }, []);

  const requestLocation = useCallback(
    (onSuccess?: (loc: LatLng) => void) => {
      if (userLocation) {
        onSuccess?.(userLocation);
        return;
      }
      if (!navigator.geolocation) {
        toast({
          title: "Geolocation not supported",
          description: "Your browser does not support location services.",
        });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: LatLng = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setUserLocation(loc);
          setLocationGranted(true);
          onSuccess?.(loc);
        },
        () => {
          toast({
            title: "Location access denied",
            description:
              "Enable location permissions to see nearby reports. Distance info will be hidden.",
          });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    },
    [userLocation, toast]
  );

  /* ── Map drawer ─────────────────────────────────────────────────── */
  const handleOpenNearMap = useCallback(() => {
    if (mapOpen) {
      setMapOpen(false);
      return;
    }
    setMapOpen(true);
    if (userLocation) {
      fetchNearbyForMap(userLocation);
    } else {
      requestLocation((loc) => fetchNearbyForMap(loc));
    }
  }, [mapOpen, userLocation, requestLocation, fetchNearbyForMap]);

  const handleMapSelectReport = useCallback(
    (r: MapReportMarker) => {
      setSelectedMapId(r._id);
      if (userLocation && r.location.coordinates) {
        const [lng, lat] = r.location.coordinates;
        setRouteTo({ lat, lng });
      }
    },
    [userLocation]
  );

  /* ── Task actions ───────────────────────────────────────────────── */
  const handleAccept = useCallback(
    async (reportId: string) => {
      if (actionLoading) return;
      setActionLoading(reportId);
      try {
        await assignSelfMutation.mutateAsync(reportId);
        await refetch();
        toast({ title: "Task accepted!", description: "It has been moved to your active tasks." });
      } catch {
        toast({
          title: "Failed to accept task",
          description: "Please try again.",
          variant: "destructive",
        });
      } finally {
        setActionLoading(null);
      }
    },
    [actionLoading, refetch, toast, assignSelfMutation]
  );

  /**
   * Core resolve action — called by ResolveWithPhotoModal with an optional URL.
   */
  const handleResolve = useCallback(
    async (reportId: string, resolutionImageUrl?: string) => {
      if (actionLoading) return;
      setActionLoading(reportId);
      try {
        await updateStatusMutation.mutateAsync({
          reportId,
          status: "resolved",
          resolutionImageUrl,
        });
        await refetch();
        toast({
          title: "Task resolved!",
          description: resolutionImageUrl
            ? "Well done! Your cleanup photo has been saved."
            : "Well done! The report is now marked resolved.",
        });
      } catch {
        toast({
          title: "Failed to resolve task",
          description: "Please try again.",
          variant: "destructive",
        });
      } finally {
        setActionLoading(null);
      }
    },
    [actionLoading, refetch, toast, updateStatusMutation]
  );

  /* ── Resolve-with-photo modal handlers ──────────────────────────── */
  const handleOpenResolve = useCallback((report: DashboardReport) => {
    setResolveReport(report);
    setResolveModalOpen(true);
  }, []);

  /* ── Open detail / map for report ──────────────────────────────── */
  const handleOpenDetail = useCallback((report: DashboardReport) => {
    setDetailReport(report);
    setDetailOpen(true);
  }, []);

  const handleOpenMapFromCard = useCallback(
    (report: DashboardReport) => {
      if (!report.location?.coordinates) {
        toast({
          title: "Location unavailable",
          description: "This report does not include coordinates yet.",
          variant: "destructive",
        });
        return;
      }

      const [lng, lat] = report.location.coordinates;
      const destination = encodeURIComponent(`${lat},${lng}`);
      const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
      const newWindow = window.open(url, "_blank", "noopener,noreferrer");
      if (newWindow) {
        newWindow.opener = null;
      }
    },
    [toast]
  );

  const handleScrollToTasks = useCallback(() => {
    tasksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  /* ── Refresh ─────────────────────────────────────────────────────── */
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.volunteer() });
    await refetch();
  }, [queryClient, refetch]);

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 pt-24 pb-16 px-4 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-7">

          {/* 1. Hero Header */}
          <VolunteerDashboardHeader
            name={volunteerName}
            activeTaskCount={assignedToMe.length}
            isLoading={isLoading || isRefetching}
            onOpenNearMap={handleOpenNearMap}
            onRefresh={handleRefresh}
            onScrollToTasks={handleScrollToTasks}
          />

          {/* 2. Stats Grid */}
          <VolunteerStatsGrid
            stats={stats}
            assignedToMe={assignedToMe}
            resolvedByMe={resolvedByMe}
            isLoading={isLoading}
          />

          {/* 3. Badge Case */}
          <VolunteerBadgesPanel
            badges={badges}
            catalog={badgeCatalog}
            totalCleanups={totalCleanups}
            isLoading={isLoading}
          />

          {/* 4. Map Drawer (collapsible) */}
          <VolunteerMapDrawer
            open={mapOpen}
            onClose={() => setMapOpen(false)}
            assignedReports={assignedToMe}
            pendingReports={pendingNearby}
            nearbyMapReports={nearbyMapReports}
            selectedId={selectedMapId}
            onSelectReport={handleMapSelectReport}
            userLocation={userLocation}
            routeTo={routeTo}
            onClearRoute={() => setRouteTo(null)}
            isLoading={nearLoading}
          />

          {/* 5. Two-column Workboard */}
          <div ref={tasksRef} className="grid lg:grid-cols-2 gap-6">
            {/* Left: My Tasks */}
            <MyTasksBoard
              assignedToMe={assignedToMe}
              resolvedByMe={resolvedByMe}
              actionLoading={actionLoading}
              onOpenResolve={handleOpenResolve}
              onOpenDetail={handleOpenDetail}
              onOpenMap={handleOpenMapFromCard}
              userLat={userLocation?.lat}
              userLng={userLocation?.lng}
            />

            {/* Right: Available Reports Feed */}
            <AvailableReportsFeed
              reports={pendingNearby}
              actionLoading={actionLoading}
              onAccept={handleAccept}
              onOpenDetail={handleOpenDetail}
              userLat={userLocation?.lat}
              userLng={userLocation?.lng}
              locationGranted={locationGranted}
            />
          </div>
        </div>
      </main>

      <Footer />

      {/* Task Detail Modal */}
      <TaskDetailsModal
        report={detailReport}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        actionLoading={!!(detailReport && actionLoading === detailReport._id)}
        canAccept={detailReport?.status === "pending"}
        canResolve={detailReport?.status === "assigned"}
        onAccept={handleAccept}
        onOpenResolve={handleOpenResolve}
        onOpenMap={handleOpenMapFromCard}
      />

      {/* Resolve-with-Photo Modal */}
      <ResolveWithPhotoModal
        report={resolveReport}
        open={resolveModalOpen}
        onClose={() => {
          setResolveModalOpen(false);
          setResolveReport(null);
        }}
        onConfirm={handleResolve}
        isLoading={!!(resolveReport && actionLoading === resolveReport._id)}
      />
    </div>
  );
};

export default VolunteerDashboard;

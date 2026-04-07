import { useState, useEffect } from "react";
import { Save, RefreshCw, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { AdminTopbar } from "@/components/admin/Topbar";
import { useToast } from "@/hooks/use-toast";
import { useAdminSettingsQuery, useUpdateSettingsMutation } from "@/hooks/useAdminQueries";
import type { SystemSettings, DateRange } from "@/types/admin";

const DEFAULT_SETTINGS: SystemSettings = {
  key: "system",
  reportAutoExpiryDays: 90,
  mapDefaultRadiusKm: 10,
  severityThresholds: { lowUrgencyDays: 14, mediumUrgencyDays: 7, highUrgencyDays: 2 },
  allowVolunteerSelfAssign: true,
  requireImageForReport: true,
  maxReportsPerDay: 50,
};

export default function AdminSettings() {
  const { toast } = useToast();
  const [range, setRange] = useState<DateRange>("30d");
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [isDirty, setIsDirty] = useState(false);

  // React Query
  const { data: settingsRes, isLoading: loading, refetch } = useAdminSettingsQuery();
  const updateMutation = useUpdateSettingsMutation();

  // Sync settings from query to local state
  useEffect(() => {
    if (settingsRes?.data) {
      setSettings(settingsRes.data);
      setIsDirty(false);
    }
  }, [settingsRes]);

  function patch(partial: Partial<SystemSettings>) {
    setSettings((prev) => ({ ...prev, ...partial }));
    setIsDirty(true);
  }

  function patchThresholds(partial: Partial<SystemSettings["severityThresholds"]>) {
    setSettings((prev) => ({
      ...prev,
      severityThresholds: { ...prev.severityThresholds, ...partial },
    }));
    setIsDirty(true);
  }

  async function handleSave() {
    try {
      await updateMutation.mutateAsync(settings);
      setIsDirty(false);
      toast({ title: "Settings saved", description: "Changes applied successfully." });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save";
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    }
  }

  const saving = updateMutation.isPending;

  return (
    <div className="flex flex-col min-h-screen">
      <AdminTopbar
        title="Settings"
        subtitle="System-wide configuration"
        range={range}
        onRangeChange={setRange}
      />

      <div className="flex-1 p-6 max-w-3xl mx-auto w-full space-y-6">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Report Management */}
            <Card className="border-border/60 p-6">
              <h3 className="font-semibold text-base mb-1">Report Management</h3>
              <p className="text-xs text-muted-foreground mb-5">
                Configure how reports are created and managed.
              </p>

              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">Report Auto-Expiry (days)</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Reports older than this will be marked as expired.
                    </p>
                  </div>
                  <Input
                    type="number"
                    className="w-24 text-center"
                    min={1}
                    max={365}
                    value={settings.reportAutoExpiryDays}
                    onChange={(e) => patch({ reportAutoExpiryDays: Number(e.target.value) })}
                  />
                </div>

                <Separator />

                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">Max Reports Per Day (per user)</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Limit how many reports a single user can submit in 24 hours.
                    </p>
                  </div>
                  <Input
                    type="number"
                    className="w-24 text-center"
                    min={1}
                    max={500}
                    value={settings.maxReportsPerDay}
                    onChange={(e) => patch({ maxReportsPerDay: Number(e.target.value) })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">Require Image for Report</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Users must attach an image when submitting a new waste report.
                    </p>
                  </div>
                  <Switch
                    checked={settings.requireImageForReport}
                    onCheckedChange={(v) => patch({ requireImageForReport: v })}
                  />
                </div>
              </div>
            </Card>

            {/* Volunteer Settings */}
            <Card className="border-border/60 p-6">
              <h3 className="font-semibold text-base mb-1">Volunteer Settings</h3>
              <p className="text-xs text-muted-foreground mb-5">
                Control volunteer assignment behavior.
              </p>

              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium">Allow Volunteer Self-Assignment</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Volunteers can assign themselves to open reports without admin approval.
                  </p>
                </div>
                <Switch
                  checked={settings.allowVolunteerSelfAssign}
                  onCheckedChange={(v) => patch({ allowVolunteerSelfAssign: v })}
                />
              </div>
            </Card>

            {/* Map Settings */}
            <Card className="border-border/60 p-6">
              <h3 className="font-semibold text-base mb-1">Map Configuration</h3>
              <p className="text-xs text-muted-foreground mb-5">
                Default map behavior for the report map view.
              </p>

              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium">Default Radius (km)</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Initial search radius shown on the map.
                  </p>
                </div>
                <Input
                  type="number"
                  className="w-24 text-center"
                  min={1}
                  max={100}
                  value={settings.mapDefaultRadiusKm}
                  onChange={(e) => patch({ mapDefaultRadiusKm: Number(e.target.value) })}
                />
              </div>
            </Card>

            {/* Severity Thresholds */}
            <Card className="border-border/60 p-6">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-base">Severity Thresholds</h3>
                <div title="Days before a report is escalated to the next urgency level">
                  <Info className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-5">
                Number of days a report can remain unresolved before escalating urgency.
              </p>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium mb-3 inline-block">
                    Low
                  </div>
                  <Input
                    type="number"
                    className="text-center"
                    min={1}
                    max={365}
                    value={settings.severityThresholds.lowUrgencyDays}
                    onChange={(e) => patchThresholds({ lowUrgencyDays: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">days</p>
                </div>

                <div className="text-center">
                  <div className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium mb-3 inline-block">
                    Medium
                  </div>
                  <Input
                    type="number"
                    className="text-center"
                    min={1}
                    max={365}
                    value={settings.severityThresholds.mediumUrgencyDays}
                    onChange={(e) => patchThresholds({ mediumUrgencyDays: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">days</p>
                </div>

                <div className="text-center">
                  <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium mb-3 inline-block">
                    High
                  </div>
                  <Input
                    type="number"
                    className="text-center"
                    min={1}
                    max={365}
                    value={settings.severityThresholds.highUrgencyDays}
                    onChange={(e) => patchThresholds({ highUrgencyDays: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">days</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-4 p-3 bg-muted/40 rounded-lg flex gap-2 items-start">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                Example: Low=14 means a report open for 14+ days becomes medium urgency. Medium=7 means
                it escalates to high after an additional 7 days.
              </p>
            </Card>

            {/* Save bar */}
            <div className="flex items-center justify-between pt-2 pb-6">
              <p className="text-xs text-muted-foreground">
                {isDirty ? "You have unsaved changes." : "All settings are saved."}
              </p>
              <Button
                onClick={handleSave}
                disabled={saving || !isDirty}
                className="gap-1.5 min-w-28"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? "Saving…" : "Save Settings"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  User, CheckCircle, Clock, Star,
  ChevronDown, ChevronUp, BarChart2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminTopbar } from "@/components/admin/Topbar";
import { useToast } from "@/hooks/use-toast";
import { listAdminVolunteers, getAdminVolunteer } from "@/services/admin";
import type { AdminVolunteer, AdminReport, DateRange } from "@/types/admin";

export default function AdminVolunteers() {
  const { toast } = useToast();
  const [range, setRange] = useState<DateRange>("30d");
  const [volunteers, setVolunteers] = useState<AdminVolunteer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<Record<string, { user: AdminVolunteer; tasks: AdminReport[]; stats: { total: number; resolved: number; inProgress: number; completionRate: number } }>>({});
  const [expandLoading, setExpandLoading] = useState<string | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await listAdminVolunteers({ limit: 50, search: q });
      setVolunteers(res.data);
      setTotal(res.pagination.total);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load(search);
  }, [search, load]);

  async function toggleExpand(uid: string) {
    if (expanded === uid) {
      setExpanded(null);
      return;
    }
    setExpanded(uid);
    if (!expandedData[uid]) {
      setExpandLoading(uid);
      try {
        const res = await getAdminVolunteer(uid);
        setExpandedData((prev) => ({ ...prev, [uid]: res.data }));
      } catch {
        // silently fail — row still expand without task list
      } finally {
        setExpandLoading(null);
      }
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AdminTopbar
        title="Volunteers"
        subtitle="Manage your volunteer workforce"
        range={range}
        onRangeChange={setRange}
        onSearch={setSearch}
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Summary badges */}
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="bg-card border border-border/60 rounded-full px-3 py-1 text-muted-foreground">
            {total} total volunteers
          </span>
          <span className="bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 text-emerald-700">
            {volunteers.filter((v) => v.isActive).length} active
          </span>
        </div>

        {/* Volunteer cards */}
        <div className="space-y-3">
          {loading && Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse" />
          ))}
          {!loading && volunteers.length === 0 && (
            <Card className="border-border/60 p-12 text-center">
              <User className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No volunteers found</p>
            </Card>
          )}
          {!loading && volunteers.map((vol, i) => {
            const isOpen = expanded === vol.firebaseUid;
            const detail = expandedData[vol.firebaseUid];
            return (
              <motion.div
                key={vol.firebaseUid}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-card border border-border/60 rounded-xl overflow-hidden"
              >
                {/* Main row */}
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleExpand(vol.firebaseUid)}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                    {vol.name?.[0]?.toUpperCase() || "V"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{vol.name}</p>
                      <Badge variant="outline" className={`text-xs ${vol.isActive ? "text-emerald-600 border-emerald-300 bg-emerald-50" : "text-muted-foreground"}`}>
                        {vol.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{vol.email}</p>
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-6 shrink-0">
                    <StatPill icon={BarChart2} label="Assigned" value={vol.stats.assigned} color="text-primary" />
                    <StatPill icon={CheckCircle} label="Resolved" value={vol.stats.resolved} color="text-emerald-600" />
                    <StatPill icon={Star} label="Rate" value={`${vol.stats.completionRate}%`} color="text-amber-600" />
                  </div>

                  {/* Toggle */}
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 ml-2">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>

                {/* Expanded */}
                {isOpen && (
                  <div className="border-t border-border/60 px-5 py-4 space-y-4 bg-muted/20">
                    {expandLoading === vol.firebaseUid ? (
                      <div className="flex items-center gap-2 py-4">
                        <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <span className="text-sm text-muted-foreground">Loading tasks…</span>
                      </div>
                    ) : (
                      <>
                        {/* Profile info */}
                        {vol.volunteerProfile?.bio && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Bio</p>
                            <p className="text-sm">{vol.volunteerProfile.bio}</p>
                          </div>
                        )}

                        {/* Skills */}
                        {vol.volunteerProfile?.skills && vol.volunteerProfile.skills.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Skills</p>
                            <div className="flex flex-wrap gap-1.5">
                              {vol.volunteerProfile.skills.map((s) => (
                                <Badge key={s} variant="secondary" className="text-xs capitalize">{s.replace(/-/g, " ")}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recent tasks */}
                        {detail?.tasks && detail.tasks.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                              Recent Tasks ({detail.tasks.length})
                            </p>
                            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                              {detail.tasks.slice(0, 10).map((task) => (
                                <div key={task._id} className="flex items-center gap-3 text-sm p-2 rounded-lg bg-background">
                                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                                    task.status === "resolved" ? "bg-emerald-500" :
                                    task.status === "in_progress" ? "bg-violet-500" :
                                    "bg-amber-500"
                                  }`} />
                                  <span className="flex-1 truncate text-xs">
                                    {task.title || task.description?.slice(0, 50) || "Untitled"}
                                  </span>
                                  <span className="text-xs text-muted-foreground capitalize shrink-0">{task.status}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {detail?.tasks?.length === 0 && (
                          <p className="text-sm text-muted-foreground">No tasks assigned yet.</p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <Icon className={`w-4 h-4 ${color}`} />
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

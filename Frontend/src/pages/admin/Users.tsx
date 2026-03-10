import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ChevronLeft, ChevronRight, MoreVertical,
  ShieldCheck, UserX, UserCheck, Loader2, X,
  AlertTriangle, CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { AdminTopbar } from "@/components/admin/Topbar";
import { useToast } from "@/hooks/use-toast";
import {
  listAdminUsers,
  getAdminUserDetail,
  updateUserRole,
  updateUserSuspension,
  getAdminUserReports,
  getAdminUserTasks,
} from "@/services/admin";
import type {
  AdminUser,
  AdminUserDetail,
  AdminReport,
  AppRole,
  UserFilters,
} from "@/types/admin";
import { cn } from "@/lib/utils";

// ── Helpers ──────────────────────────────────────────────────────────

const ROLE_COLORS: Record<AppRole, string> = {
  citizen:   "bg-blue-100 text-blue-700 border-blue-200",
  volunteer: "bg-emerald-100 text-emerald-700 border-emerald-200",
  staff:     "bg-purple-100 text-purple-700 border-purple-200",
  admin:     "bg-amber-100 text-amber-700 border-amber-200",
};

const REPORT_STATUS_COLORS: Record<string, string> = {
  pending:     "bg-yellow-100 text-yellow-700",
  verified:    "bg-blue-100 text-blue-700",
  assigned:    "bg-purple-100 text-purple-700",
  in_progress: "bg-cyan-100 text-cyan-700",
  resolved:    "bg-emerald-100 text-emerald-700",
  rejected:    "bg-red-100 text-red-700",
};

const ALL_ROLES: AppRole[] = ["citizen", "volunteer", "staff", "admin"];

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function UserAvatar({ user }: { user: AdminUser }) {
  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name}
        className="w-9 h-9 rounded-full object-cover border border-border/60 shrink-0"
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary font-semibold text-sm">
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}

// ── Filters Bar ───────────────────────────────────────────────────────

interface FiltersBarProps {
  filters: UserFilters;
  onChange: (f: Partial<UserFilters>) => void;
  total: number;
}

function FiltersBar({ filters, onChange, total }: FiltersBarProps) {
  const [search, setSearch] = useState(filters.q || "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  useEffect(() => {
    setSearch(filters.q || "");
  }, [filters.q]);

  function handleSearch(v: string) {
    setSearch(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ q: v, page: 1 });
    }, 350);
  }

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
        {search && (
          <button
            onClick={() => handleSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Role filter */}
      <select
        value={filters.role || ""}
        onChange={(e) => onChange({ role: e.target.value as AppRole | "", page: 1 })}
        className="h-9 px-3 text-sm rounded-md border border-input bg-background cursor-pointer"
      >
        <option value="">All Roles</option>
        {ALL_ROLES.map((r) => (
          <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
        ))}
      </select>

      {/* Status filter */}
      <select
        value={filters.status || ""}
        onChange={(e) => onChange({ status: e.target.value as "active" | "suspended" | "", page: 1 })}
        className="h-9 px-3 text-sm rounded-md border border-input bg-background cursor-pointer"
      >
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="suspended">Suspended</option>
      </select>

      {/* Sort */}
      <select
        value={filters.sort || "newest"}
        onChange={(e) => onChange({ sort: e.target.value as UserFilters["sort"], page: 1 })}
        className="h-9 px-3 text-sm rounded-md border border-input bg-background cursor-pointer"
      >
        <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
        <option value="name">Name A→Z</option>
      </select>

      <span className="text-sm text-muted-foreground ml-auto whitespace-nowrap">
        {total} user{total !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

// ── Role Change Dialog ────────────────────────────────────────────────

interface RoleDialogProps {
  user: AdminUser;
  onClose: () => void;
  onConfirm: (role: AppRole) => Promise<void>;
}

function RoleDialog({ user, onClose, onConfirm }: RoleDialogProps) {
  const [role, setRole] = useState<AppRole>(user.role);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (role === user.role) { onClose(); return; }
    setLoading(true);
    try {
      await onConfirm(role);
    } catch {
      // error already handled and toasted by the parent; keep the dialog open
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Role</DialogTitle>
          <DialogDescription>
            Update role for <strong>{user.name}</strong> ({user.email})
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <p className="text-sm text-muted-foreground">
            Current role: <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", ROLE_COLORS[user.role])}>{user.role}</span>
          </p>
          <div>
            <label className="text-sm font-medium mb-1 block">New Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AppRole)}
              className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background"
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>
          {role !== user.role && (
            <p className="text-sm text-amber-600 bg-amber-50 rounded-md px-3 py-2 border border-amber-200">
              Changing role from <strong>{user.role}</strong> → <strong>{role}</strong>. The user will get new permissions on their next request.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={loading || role === user.role}>
            {loading && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Suspend Dialog ────────────────────────────────────────────────────

interface SuspendDialogProps {
  user: AdminUser;
  onClose: () => void;
  onConfirm: (isSuspended: boolean, reason?: string) => Promise<void>;
}

function SuspendDialog({ user, onClose, onConfirm }: SuspendDialogProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const isSuspending = !user.isSuspended;

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm(isSuspending, isSuspending ? reason : undefined);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className={isSuspending ? "text-destructive" : undefined}>
            {isSuspending ? "Suspend Account" : "Unsuspend Account"}
          </DialogTitle>
          <DialogDescription>
            {isSuspending
              ? `Suspending ${user.name} will prevent them from accessing CleanSight.`
              : `Restoring access for ${user.name}.`}
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-3">
          {isSuspending && (
            <div>
              <label className="text-sm font-medium mb-1 block">
                Reason <span className="text-muted-foreground">(optional)</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="e.g. Violation of community guidelines…"
                className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          )}
          {!isSuspending && user.suspendedReason && (
            <p className="text-sm text-muted-foreground bg-muted/60 rounded-md px-3 py-2">
              Previous reason: <em>{user.suspendedReason}</em>
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            variant={isSuspending ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
            {isSuspending ? "Suspend" : "Unsuspend"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── User Detail Drawer ────────────────────────────────────────────────

interface DrawerProps {
  userId: string;
  onClose: () => void;
  onRoleChange: (user: AdminUser, newRole: AppRole) => Promise<void>;
  onSuspend: (user: AdminUser, isSuspended: boolean, reason?: string) => Promise<void>;
}

function UserDetailDrawer({ userId, onClose, onRoleChange, onSuspend }: DrawerProps) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "reports" | "tasks">("overview");
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [tasks, setTasks] = useState<AdminReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [reportPage, setReportPage] = useState(1);
  const [reportTotal, setReportTotal] = useState(0);
  const [taskPage, setTaskPage] = useState(1);
  const [taskTotal, setTaskTotal] = useState(0);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const { toast } = useToast();

  const LIMIT = 10;

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminUserDetail(userId);
      setDetail(res.data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load user";
      toast({ title: "Error", description: msg, variant: "destructive" });
      onClose();
    } finally {
      setLoading(false);
    }
  }, [userId, onClose, toast]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  async function loadReports(page: number) {
    if (!detail) return;
    setReportsLoading(true);
    try {
      const res = await getAdminUserReports(userId, page, LIMIT);
      setReports(res.data);
      setReportTotal(res.pagination.total);
      setReportPage(page);
    } catch {
      toast({ title: "Error", description: "Failed to load reports", variant: "destructive" });
    } finally {
      setReportsLoading(false);
    }
  }

  async function loadTasks(page: number) {
    if (!detail) return;
    setTasksLoading(true);
    try {
      const res = await getAdminUserTasks(userId, page, LIMIT);
      setTasks(res.data);
      setTaskTotal(res.pagination.total);
      setTaskPage(page);
    } catch {
      toast({ title: "Error", description: "Failed to load tasks", variant: "destructive" });
    } finally {
      setTasksLoading(false);
    }
  }

  useEffect(() => {
    if (!detail) return;
    if (activeTab === "reports" && reports.length === 0) loadReports(1);
    if (activeTab === "tasks" && tasks.length === 0) loadTasks(1);
  }, [activeTab, detail]); // eslint-disable-line

  async function handleRoleChange(role: AppRole) {
    if (!detail) return;
    await onRoleChange(detail.user, role);
    await loadDetail();
    setShowRoleDialog(false);
  }

  async function handleSuspend(isSuspended: boolean, reason?: string) {
    if (!detail) return;
    await onSuspend(detail.user, isSuspended, reason);
    await loadDetail();
    setShowSuspendDialog(false);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed right-0 top-0 h-full w-full max-w-lg bg-background border-l border-border/60 shadow-2xl z-50 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 shrink-0">
          <h2 className="font-semibold text-base">User Details</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : detail ? (
          <div className="flex-1 overflow-y-auto">
            {/* Profile banner */}
            <div className="px-5 py-5 border-b border-border/60">
              {detail.user.isSuspended && (
                <div className="mb-3 flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>Account Suspended</strong>
                    {detail.user.suspendedReason && ` — ${detail.user.suspendedReason}`}
                  </span>
                </div>
              )}
              <div className="flex items-start gap-4">
                <div className="relative">
                  {detail.user.avatar ? (
                    <img
                      src={detail.user.avatar}
                      alt={detail.user.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-border"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-bold text-xl">
                      {detail.user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {detail.user.isVerified && (
                    <CheckCircle2 className="absolute -bottom-1 -right-1 w-4 h-4 text-emerald-500 bg-background rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base truncate">{detail.user.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{detail.user.email}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", ROLE_COLORS[detail.user.role])}>
                      {detail.user.role}
                    </span>
                    {detail.user.isSuspended && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-red-100 text-red-700 border-red-200">
                        suspended
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowRoleDialog(true)}
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                  Change Role
                </Button>
                <Button
                  size="sm"
                  variant={detail.user.isSuspended ? "default" : "destructive"}
                  className="flex-1"
                  onClick={() => setShowSuspendDialog(true)}
                >
                  {detail.user.isSuspended ? (
                    <><UserCheck className="w-3.5 h-3.5 mr-1.5" />Unsuspend</>
                  ) : (
                    <><UserX className="w-3.5 h-3.5 mr-1.5" />Suspend</>
                  )}
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border/60 px-5">
              {(["overview", "reports", "tasks"] as const).filter(t => t !== "tasks" || detail.user.role === "volunteer").map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "py-3 px-1 mr-5 text-sm font-medium border-b-2 -mb-px transition-colors",
                    activeTab === tab
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="px-5 py-4">
              {/* Overview tab */}
              {activeTab === "overview" && (
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border/60 bg-card p-3">
                      <p className="text-xs text-muted-foreground mb-1">Reports Submitted</p>
                      <p className="text-2xl font-bold">{detail.stats.reportsSubmitted}</p>
                    </div>
                    {detail.user.role === "volunteer" && (
                      <div className="rounded-xl border border-border/60 bg-card p-3">
                        <p className="text-xs text-muted-foreground mb-1">Tasks Completed</p>
                        <p className="text-2xl font-bold">{detail.stats.tasksCompleted ?? 0}</p>
                      </div>
                    )}
                    <div className="rounded-xl border border-border/60 bg-card p-3">
                      <p className="text-xs text-muted-foreground mb-1">Last Activity</p>
                      <p className="text-sm font-medium">{formatDate(detail.stats.lastActivity)}</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-card p-3">
                      <p className="text-xs text-muted-foreground mb-1">Joined</p>
                      <p className="text-sm font-medium">{formatDate(detail.user.createdAt)}</p>
                    </div>
                  </div>

                  {/* Profile details */}
                  <div className="rounded-xl border border-border/60 bg-card divide-y divide-border/60">
                    {[
                      { label: "Firebase UID", value: detail.user.firebaseUid },
                      { label: "Phone", value: detail.user.phone || "—" },
                      { label: "Verified", value: detail.user.isVerified ? "Yes" : "No" },
                      { label: "Cleanups Completed", value: String(detail.user.cleanupsCompleted) },
                      ...(detail.user.suspendedAt ? [{ label: "Suspended At", value: formatDate(detail.user.suspendedAt) }] : []),
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center px-3 py-2.5 text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium text-right truncate max-w-[200px]" title={value}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reports tab */}
              {activeTab === "reports" && (
                <div className="space-y-3">
                  {reportsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-14 rounded-lg bg-muted/50 animate-pulse" />
                    ))
                  ) : reports.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">No reports found</p>
                  ) : (
                    <>
                      {reports.map((r) => (
                        <div key={r._id} className="rounded-lg border border-border/60 p-3 text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium truncate">{r.title || r.description.slice(0, 60)}</p>
                            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium shrink-0", REPORT_STATUS_COLORS[r.status])}>
                              {r.status.replace("_", " ")}
                            </span>
                          </div>
                          <p className="text-muted-foreground mt-0.5">{formatDate(r.createdAt)}</p>
                        </div>
                      ))}
                      {/* Pagination */}
                      {reportTotal > LIMIT && (
                        <div className="flex items-center justify-between pt-2">
                          <Button
                            size="sm" variant="outline"
                            disabled={reportPage <= 1 || reportsLoading}
                            onClick={() => loadReports(reportPage - 1)}
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            Page {reportPage} of {Math.ceil(reportTotal / LIMIT)}
                          </span>
                          <Button
                            size="sm" variant="outline"
                            disabled={reportPage >= Math.ceil(reportTotal / LIMIT) || reportsLoading}
                            onClick={() => loadReports(reportPage + 1)}
                          >
                            <ChevronRight className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Tasks tab (volunteers only) */}
              {activeTab === "tasks" && (
                <div className="space-y-3">
                  {tasksLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-14 rounded-lg bg-muted/50 animate-pulse" />
                    ))
                  ) : tasks.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">No assigned tasks found</p>
                  ) : (
                    <>
                      {tasks.map((t) => (
                        <div key={t._id} className="rounded-lg border border-border/60 p-3 text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium truncate">{t.title || t.description.slice(0, 60)}</p>
                            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium shrink-0", REPORT_STATUS_COLORS[t.status])}>
                              {t.status.replace("_", " ")}
                            </span>
                          </div>
                          <p className="text-muted-foreground mt-0.5">Updated {formatDate(t.updatedAt)}</p>
                        </div>
                      ))}
                      {taskTotal > LIMIT && (
                        <div className="flex items-center justify-between pt-2">
                          <Button
                            size="sm" variant="outline"
                            disabled={taskPage <= 1 || tasksLoading}
                            onClick={() => loadTasks(taskPage - 1)}
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            Page {taskPage} of {Math.ceil(taskTotal / LIMIT)}
                          </span>
                          <Button
                            size="sm" variant="outline"
                            disabled={taskPage >= Math.ceil(taskTotal / LIMIT) || tasksLoading}
                            onClick={() => loadTasks(taskPage + 1)}
                          >
                            <ChevronRight className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </motion.aside>

      {/* Role dialog */}
      {showRoleDialog && detail && (
        <RoleDialog
          user={detail.user}
          onClose={() => setShowRoleDialog(false)}
          onConfirm={handleRoleChange}
        />
      )}

      {/* Suspend dialog */}
      {showSuspendDialog && detail && (
        <SuspendDialog
          user={detail.user}
          onClose={() => setShowSuspendDialog(false)}
          onConfirm={handleSuspend}
        />
      )}
    </>
  );
}

// ── Users Table Row ───────────────────────────────────────────────────

interface RowProps {
  user: AdminUser;
  onView: () => void;
  onChangeRole: () => void;
  onSuspend: () => void;
}

function UserRow({ user, onView, onChangeRole, onSuspend }: RowProps) {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="group border-b border-border/40 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={onView}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <UserAvatar user={user} />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", ROLE_COLORS[user.role])}>
          {user.role}
        </span>
      </td>
      <td className="px-4 py-3">
        {user.isSuspended ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-red-100 text-red-700 border-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            Suspended
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-emerald-100 text-emerald-700 border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            Active
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(user.createdAt)}</td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onView}>View Details</DropdownMenuItem>
            <DropdownMenuItem onClick={onChangeRole}>Change Role</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onSuspend}
              className={user.isSuspended ? "text-emerald-600" : "text-destructive"}
            >
              {user.isSuspended ? "Unsuspend" : "Suspend"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </motion.tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────

export default function AdminUsers() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<UserFilters>({ sort: "newest", page: 1, limit: 20 });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [quickRoleUser, setQuickRoleUser] = useState<AdminUser | null>(null);
  const [quickSuspendUser, setQuickSuspendUser] = useState<AdminUser | null>(null);

  const LIMIT = filters.limit ?? 20;
  const currentPage = filters.page ?? 1;
  const totalPages = Math.ceil(total / LIMIT);

  const loadUsers = useCallback(async (f: UserFilters) => {
    setLoading(true);
    try {
      const res = await listAdminUsers(f);
      setUsers(res.data);
      setTotal(res.pagination.total);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load users";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadUsers(filters);
  }, [filters, loadUsers]);

  function setFilter(partial: Partial<UserFilters>) {
    setFilters((prev) => ({ ...prev, ...partial }));
  }

  async function handleRoleChange(user: AdminUser, newRole: AppRole) {
    try {
      await updateUserRole(user._id, newRole);
      toast({ title: "Role Updated", description: `${user.name} is now a ${newRole}.` });
      loadUsers(filters);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update role";
      toast({ title: "Error", description: msg, variant: "destructive" });
      throw e;
    }
  }

  async function handleSuspend(user: AdminUser, isSuspended: boolean, reason?: string) {
    try {
      await updateUserSuspension(user._id, isSuspended, reason);
      toast({
        title: isSuspended ? "Account Suspended" : "Account Restored",
        description: isSuspended
          ? `${user.name} can no longer access CleanSight.`
          : `${user.name}'s access has been restored.`,
      });
      loadUsers(filters);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update suspension";
      toast({ title: "Error", description: msg, variant: "destructive" });
      throw e;
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AdminTopbar
        title="Users"
        subtitle="Manage all platform users"
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Filters */}
        <FiltersBar filters={filters} onChange={setFilter} total={total} />

        {/* Summary badges */}
        <div className="flex flex-wrap gap-2 text-sm">
          {[
            { label: "All", count: users.length },
            { label: "Suspended", count: users.filter(u => u.isSuspended).length },
          ].map(({ label, count }) => (
            <span key={label} className="bg-card border border-border/60 rounded-full px-3 py-1 text-muted-foreground">
              {count} {label.toLowerCase()}
            </span>
          ))}
        </div>

        {/* Table */}
        <Card className="border-border/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border/60 bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {loading && Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/40">
                    <td className="px-4 py-3" colSpan={5}>
                      <div className="h-10 bg-muted/50 rounded-md animate-pulse" />
                    </td>
                  </tr>
                ))}
                {!loading && users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                )}
                {!loading && users.map((user) => (
                  <UserRow
                    key={user._id}
                    user={user}
                    onView={() => setSelectedUserId(user._id)}
                    onChangeRole={() => setQuickRoleUser(user)}
                    onSuspend={() => setQuickSuspendUser(user)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/60">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-1.5">
                <Button
                  size="sm" variant="outline"
                  disabled={currentPage <= 1 || loading}
                  onClick={() => setFilter({ page: currentPage - 1 })}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm" variant="outline"
                  disabled={currentPage >= totalPages || loading}
                  onClick={() => setFilter({ page: currentPage + 1 })}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* User detail drawer */}
      <AnimatePresence>
        {selectedUserId && (
          <UserDetailDrawer
            key={selectedUserId}
            userId={selectedUserId}
            onClose={() => setSelectedUserId(null)}
            onRoleChange={handleRoleChange}
            onSuspend={handleSuspend}
          />
        )}
      </AnimatePresence>

      {/* Quick role change dialog (from row menu) */}
      {quickRoleUser && (
        <RoleDialog
          user={quickRoleUser}
          onClose={() => setQuickRoleUser(null)}
          onConfirm={async (role) => {
            await handleRoleChange(quickRoleUser, role);
            setQuickRoleUser(null);
          }}
        />
      )}

      {/* Quick suspend dialog (from row menu) */}
      {quickSuspendUser && (
        <SuspendDialog
          user={quickSuspendUser}
          onClose={() => setQuickSuspendUser(null)}
          onConfirm={async (isSuspended, reason) => {
            await handleSuspend(quickSuspendUser, isSuspended, reason);
            setQuickSuspendUser(null);
          }}
        />
      )}
    </div>
  );
}

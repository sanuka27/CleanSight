import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  ClipboardList, RefreshCw, ChevronLeft, ChevronRight,
  User, FileText, Settings, Flag, Info, X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminTopbar } from "@/components/admin/Topbar";
import { useAuditLogsQuery } from "@/hooks/useAdminQueries";
import type {
  AuditLog,
  AuditAction,
  AuditEntityType,
  AuditLogFilters,
} from "@/types/admin";

// ── Constants ───────────────────────────────────────────────────────

const ACTION_LABELS: Record<AuditAction, string> = {
  REPORT_STATUS_CHANGED: "Status Changed",
  REPORT_ASSIGNED:       "Report Assigned",
  REPORT_NOTE_ADDED:     "Note Added",
  DOCUMENT_UPLOADED:     "Document Uploaded",
  DOCUMENT_DELETED:      "Document Deleted",
  SETTINGS_UPDATED:      "Settings Updated",
  USER_ROLE_CHANGED:     "Role Changed",
  USER_SUSPENDED:        "User Suspended",
};

const ACTION_COLORS: Record<AuditAction, string> = {
  REPORT_STATUS_CHANGED: "bg-sky-100 text-sky-700 border-sky-200",
  REPORT_ASSIGNED:       "bg-violet-100 text-violet-700 border-violet-200",
  REPORT_NOTE_ADDED:     "bg-slate-100 text-slate-700 border-slate-200",
  DOCUMENT_UPLOADED:     "bg-emerald-100 text-emerald-700 border-emerald-200",
  DOCUMENT_DELETED:      "bg-red-100 text-red-700 border-red-200",
  SETTINGS_UPDATED:      "bg-amber-100 text-amber-700 border-amber-200",
  USER_ROLE_CHANGED:     "bg-purple-100 text-purple-700 border-purple-200",
  USER_SUSPENDED:        "bg-orange-100 text-orange-700 border-orange-200",
};

const ENTITY_ICONS: Record<AuditEntityType, typeof Flag> = {
  report:   Flag,
  document: FileText,
  settings: Settings,
  user:     User,
};

const PAGE_SIZE = 30;

// ── Helpers ──────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function metadataSummary(action: AuditAction, meta: Record<string, unknown>): string {
  switch (action) {
    case "REPORT_STATUS_CHANGED":
      return meta.statusFrom && meta.statusTo
        ? `${meta.statusFrom} → ${meta.statusTo}`
        : "";
    case "REPORT_ASSIGNED":
      return meta.assignedToName
        ? `To: ${meta.assignedToName}`
        : meta.assignedToEmail
        ? `To: ${meta.assignedToEmail}`
        : "";
    case "REPORT_NOTE_ADDED":
      return meta.noteLength ? `${meta.noteLength} chars` : "";
    case "DOCUMENT_UPLOADED":
      return meta.title ? String(meta.title) : "";
    case "DOCUMENT_DELETED":
      return meta.title ? `Deleted: ${meta.title}` : "";
    case "SETTINGS_UPDATED": {
      const fields = Object.keys(meta.newValues as Record<string, unknown> ?? {});
      return fields.length ? `Changed: ${fields.join(", ")}` : "";
    }
    default:
      return "";
  }
}

// ── Main Page ────────────────────────────────────────────────────────

export default function AdminAuditLog() {
  const [page, setPage] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<AuditAction | "">("");
  const [entityFilter, setEntityFilter] = useState<AuditEntityType | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]   = useState("");

  // Detail drawer
  const [selected, setSelected] = useState<AuditLog | null>(null);

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  // Build filters
  const filters: AuditLogFilters = {
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    action: actionFilter || undefined,
    entityType: entityFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  // React Query
  const { data: logsRes, isLoading: loading, refetch } = useAuditLogsQuery(filters);
  const logs = logsRes?.data ?? [];
  const total = logsRes?.pagination?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Reset to page 1 when filters change
  const prevFiltersRef = useRef({ debouncedSearch, actionFilter, entityFilter, dateFrom, dateTo });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    if (
      prev.debouncedSearch !== debouncedSearch ||
      prev.actionFilter !== actionFilter ||
      prev.entityFilter !== entityFilter ||
      prev.dateFrom !== dateFrom ||
      prev.dateTo !== dateTo
    ) {
      setPage(1);
      prevFiltersRef.current = { debouncedSearch, actionFilter, entityFilter, dateFrom, dateTo };
    }
  }, [debouncedSearch, actionFilter, entityFilter, dateFrom, dateTo]);

  return (
    <div className="flex flex-col min-h-screen">
      <AdminTopbar
        title="Audit Log"
        subtitle="Every admin action recorded in real-time"
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <ClipboardList className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search actor, entity ID…"
              className="pl-8 h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Action filter */}
          <Select value={actionFilter || "all"} onValueChange={(v) => setActionFilter(v === "all" ? "" : v as AuditAction)}>
            <SelectTrigger className="h-9 w-44 text-sm">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {(Object.keys(ACTION_LABELS) as AuditAction[]).map((a) => (
                <SelectItem key={a} value={a}>{ACTION_LABELS[a]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Entity type filter */}
          <Select value={entityFilter || "all"} onValueChange={(v) => setEntityFilter(v === "all" ? "" : v as AuditEntityType)}>
            <SelectTrigger className="h-9 w-36 text-sm">
              <SelectValue placeholder="All Entities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              <SelectItem value="report">Report</SelectItem>
              <SelectItem value="document">Document</SelectItem>
              <SelectItem value="settings">Settings</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>

          {/* Date range */}
          <input
            type="date"
            className="h-9 text-xs px-2 rounded-md border border-input bg-background w-32"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            title="From date"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <input
            type="date"
            className="h-9 text-xs px-2 rounded-md border border-input bg-background w-32"
            value={dateTo}
            min={dateFrom}
            onChange={(e) => setDateTo(e.target.value)}
            title="To date"
          />

          <Button
            variant="ghost" size="sm"
            onClick={() => { setSearch(""); setActionFilter(""); setEntityFilter(""); setDateFrom(""); setDateTo(""); }}
            className="h-9 text-xs text-muted-foreground"
            title="Clear filters"
          >
            <X className="w-3.5 h-3.5" />
          </Button>

          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={loading} className="h-9">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Count */}
        <p className="text-xs text-muted-foreground">
          {loading ? "Loading…" : `${total} audit log entries`}
        </p>

        {/* Table */}
        <Card className="border-border/60 overflow-hidden">
          {/* Header */}
          <div className="hidden md:grid grid-cols-[160px_180px_140px_160px_1fr] gap-4 px-4 py-2.5 bg-muted/40 border-b border-border/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Time</span>
            <span>Action</span>
            <span>Entity</span>
            <span>Actor</span>
            <span>Details</span>
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="divide-y divide-border/40">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="px-4 py-3 grid grid-cols-[160px_180px_140px_160px_1fr] gap-4 animate-pulse">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="h-4 bg-muted rounded" />
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && logs.length === 0 && (
            <div className="py-16 text-center">
              <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No audit log entries</p>
              <p className="text-sm text-muted-foreground mt-1">
                Admin actions will appear here once performed.
              </p>
            </div>
          )}

          {/* Rows */}
          {!loading && logs.length > 0 && (
            <div className="divide-y divide-border/40">
              {logs.map((log, i) => {
                const EntityIcon = ENTITY_ICONS[log.entityType] ?? Flag;
                const summary = metadataSummary(log.action, log.metadata);
                return (
                  <motion.div
                    key={log._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="grid grid-cols-1 md:grid-cols-[160px_180px_140px_160px_1fr] gap-2 md:gap-4 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer group"
                    onClick={() => setSelected(log)}
                  >
                    {/* Time */}
                    <div className="flex items-center">
                      <span
                        className="text-sm font-medium text-foreground"
                        title={new Date(log.createdAt).toLocaleString()}
                      >
                        {relativeTime(log.createdAt)}
                      </span>
                    </div>

                    {/* Action badge */}
                    <div className="flex items-center">
                      <Badge className={`border text-xs font-medium ${ACTION_COLORS[log.action] ?? "bg-muted text-muted-foreground"}`}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </Badge>
                    </div>

                    {/* Entity */}
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <EntityIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="capitalize">{log.entityType}</span>
                    </div>

                    {/* Actor */}
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-[9px] font-bold text-primary">
                          {log.actorEmail?.[0]?.toUpperCase() ?? "A"}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground truncate">
                        {log.actorEmail ?? log.actorUid}
                      </span>
                    </div>

                    {/* Details summary */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground truncate">{summary}</span>
                      <Info className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground text-xs">
              Page {page} of {totalPages} ({total} entries)
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline" size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = start + i;
                return (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0 text-xs"
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                );
              })}

              <Button
                variant="outline" size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <AuditLogDetail log={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

// ── Detail Dialog ─────────────────────────────────────────────────────

function AuditLogDetail({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  const EntityIcon = ENTITY_ICONS[log.entityType] ?? Flag;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge className={`border text-xs ${ACTION_COLORS[log.action] ?? "bg-muted text-muted-foreground"}`}>
              {ACTION_LABELS[log.action] ?? log.action}
            </Badge>
            Audit Detail
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Actor */}
          <section className="bg-muted/40 rounded-xl p-4 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Actor</p>
            <p><span className="text-muted-foreground">Email:</span> {log.actorEmail ?? "—"}</p>
            <p><span className="text-muted-foreground">UID:</span> <code className="text-xs">{log.actorUid}</code></p>
            <p><span className="text-muted-foreground">Role:</span> {log.actorRole}</p>
          </section>

          {/* Entity */}
          <section className="bg-muted/40 rounded-xl p-4 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Entity</p>
            <p className="flex items-center gap-1.5">
              <EntityIcon className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="capitalize">{log.entityType}</span>
            </p>
            <p><span className="text-muted-foreground">ID:</span> <code className="text-xs break-all">{log.entityId}</code></p>
          </section>

          {/* Metadata */}
          {Object.keys(log.metadata).length > 0 && (
            <section className="bg-muted/40 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Metadata</p>
              <pre className="text-xs bg-background rounded-lg p-3 overflow-x-auto border border-border/60 leading-relaxed">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </section>
          )}

          {/* Request info */}
          <section className="bg-muted/40 rounded-xl p-4 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Request Info</p>
            <p><span className="text-muted-foreground">IP:</span> {log.ip ?? "—"}</p>
            <p className="break-all"><span className="text-muted-foreground">User Agent:</span> {log.userAgent ?? "—"}</p>
            <p>
              <span className="text-muted-foreground">Time:</span>{" "}
              {new Date(log.createdAt).toLocaleString("en-US", {
                dateStyle: "full",
                timeStyle: "medium",
              })}
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { X, UserCheck, RefreshCw, XCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onBulkAssign: () => void;
  onBulkStatus: () => void;
  onBulkReject: () => void;
  onBulkExport: () => void;
  loading?: boolean;
}

export function BulkActionBar({
  selectedCount,
  onClear,
  onBulkAssign,
  onBulkStatus,
  onBulkReject,
  onBulkExport,
  loading,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "sticky bottom-4 z-30 mx-auto max-w-4xl",
        "flex items-center gap-2 flex-wrap",
        "bg-background border border-border shadow-lg rounded-xl px-4 py-3",
        "animate-in fade-in slide-in-from-bottom-2 duration-200"
      )}
    >
      <span className="text-sm font-semibold text-foreground mr-1">
        {selectedCount} selected
      </span>

      <div className="flex items-center gap-2 flex-wrap flex-1">
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-xs"
          onClick={onBulkAssign}
          disabled={loading}
        >
          <UserCheck className="w-3.5 h-3.5" />
          Assign
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-xs"
          onClick={onBulkStatus}
          disabled={loading}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Update Status
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive"
          onClick={onBulkReject}
          disabled={loading}
        >
          <XCircle className="w-3.5 h-3.5" />
          Reject
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-xs"
          onClick={onBulkExport}
          disabled={loading}
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 ml-auto"
        onClick={onClear}
        title="Clear selection"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

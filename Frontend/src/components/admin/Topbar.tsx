import { useState, useRef, useEffect } from "react";
import { Search, Calendar, Download, Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import type { DateRange } from "@/types/admin";

interface TopbarProps {
  title: string;
  subtitle?: string;
  range?: DateRange;
  onRangeChange?: (r: DateRange) => void;
  onSearch?: (q: string) => void;
  onExport?: () => void;
  exportLabel?: string;
  onCustomDatesChange?: (from: string, to: string) => void;
}

export const RANGE_LABELS: Record<DateRange, string> = {
  "7d": "This Week",
  "30d": "This Month",
  "90d": "Last 90 Days",
  custom: "Custom Range",
};

export function AdminTopbar({
  title,
  subtitle,
  range,
  onRangeChange,
  onSearch,
  onExport,
  exportLabel = "Export",
  onCustomDatesChange,
}: TopbarProps) {
  const { appUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (!onSearch) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(searchQuery);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, onSearch]);

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/60 px-6 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: title */}
        <div className="min-w-0">
          <h1 className="text-xl font-bold truncate">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          {onSearch && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search…"
                className="pl-8 h-9 w-48 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          {/* Date range */}
          {range !== undefined && onRangeChange !== undefined && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-9">
                <Calendar className="w-4 h-4" />
                {RANGE_LABELS[range]}
                <ChevronDown className="w-3 h-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(RANGE_LABELS) as DateRange[]).map((r) => (
                <DropdownMenuItem key={r} onClick={() => onRangeChange(r)}>
                  {RANGE_LABELS[r]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          )}

          {/* Custom date range inputs */}
          {range === "custom" && (
            <div className="flex items-center gap-1">
              <input
                type="date"
                className="h-9 text-xs px-2 rounded-md border border-input bg-background w-32"
                value={customFrom}
                onChange={(e) => {
                  setCustomFrom(e.target.value);
                  if (e.target.value && customTo) onCustomDatesChange?.(e.target.value, customTo);
                }}
              />
              <span className="text-xs text-muted-foreground">–</span>
              <input
                type="date"
                className="h-9 text-xs px-2 rounded-md border border-input bg-background w-32"
                value={customTo}
                min={customFrom}
                onChange={(e) => {
                  setCustomTo(e.target.value);
                  if (customFrom && e.target.value) onCustomDatesChange?.(customFrom, e.target.value);
                }}
              />
            </div>
          )}

          {/* Export */}
          {onExport && (
            <Button size="sm" className="gap-1.5 h-9 bg-primary hover:bg-primary/90" onClick={onExport}>
              <Download className="w-4 h-4" />
              {exportLabel}
            </Button>
          )}

          {/* Admin avatar */}
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-sm shrink-0">
            {appUser?.name?.[0]?.toUpperCase() || "A"}
          </div>
        </div>
      </div>
    </header>
  );
}

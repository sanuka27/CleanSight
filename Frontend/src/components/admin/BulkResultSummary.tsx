import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BulkActionResult } from "@/types/admin";

interface BulkResultSummaryProps {
  result: BulkActionResult;
  action: string;
}

/**
 * Expandable panel shown inside a toast (or inline) for bulk action results.
 * Lists failed items so the admin can see what went wrong.
 */
export function BulkResultSummary({ result, action }: BulkResultSummaryProps) {
  const [expanded, setExpanded] = useState(false);

  const { updatedCount, failed } = result;
  const failCount = failed.length;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm">
        <span className="font-semibold text-emerald-600">{updatedCount} succeeded</span>
        {failCount > 0 && (
          <span className="text-destructive ml-2 font-semibold">{failCount} failed</span>
        )}
      </p>

      {failCount > 0 && (
        <div>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? (
              <><ChevronUp className="w-3 h-3 mr-1" />Hide details</>
            ) : (
              <><ChevronDown className="w-3 h-3 mr-1" />View details</>
            )}
          </Button>

          {expanded && (
            <ul className="mt-1 max-h-40 overflow-y-auto text-xs space-y-1 bg-destructive/5 rounded-lg p-2 border border-destructive/20">
              {failed.map((f) => (
                <li key={f.id} className="text-destructive">
                  <span className="font-mono">{f.id.slice(-8)}</span>
                  <span className="text-muted-foreground"> — {f.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">{action}</p>
    </div>
  );
}

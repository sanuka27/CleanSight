/**
 * useActivityFeed.ts
 *
 * React hook that connects to the backend SSE activity feed endpoint
 * and maintains a bounded, newest-first list of activity events.
 *
 * Auth: EventSource does not support custom request headers, so the
 * Firebase ID token is passed as a ?token= query parameter. The backend
 * reads it and copies it into the Authorization header before running
 * adminOnly middleware.
 *
 * Reconnection: the native EventSource API reconnects automatically on
 * network drops. The hook also re-opens the connection whenever the
 * Firebase auth token changes (e.g. after a token refresh).
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { auth } from "@/lib/firebase";

// ── Types ───────────────────────────────────────────────────────────────────

export type ActivityEventType =
  | "connected"
  | "report_submitted"
  | "status_changed"
  | "report_assigned"
  | "ai_review_complete"
  | "report_resolved"
  | "report_rejected";

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  reportId: string | null;
  title: string | null;
  description: string;
  actorUid?: string;
  actorName?: string;
  previousStatus?: string;
  newStatus?: string;
  urgency?: string;
  wasteType?: string;
  timestamp: string;
}

export type FeedStatus = "connecting" | "connected" | "reconnecting" | "error" | "closed";

interface UseActivityFeedOptions {
  /** Maximum number of events to keep in memory (default: 100) */
  maxEvents?: number;
  /** Whether the feed should be active (default: true) */
  enabled?: boolean;
}

interface UseActivityFeedReturn {
  events: ActivityEvent[];
  status: FeedStatus;
  error: string | null;
  clearEvents: () => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:5000";

const DEFAULT_MAX_EVENTS = 100;

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useActivityFeed(
  options: UseActivityFeedOptions = {}
): UseActivityFeedReturn {
  const { maxEvents = DEFAULT_MAX_EVENTS, enabled = true } = options;

  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [status, setStatus] = useState<FeedStatus>("connecting");
  const [error, setError] = useState<string | null>(null);

  const esRef = useRef<EventSource | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const clearEvents = useCallback(() => setEvents([]), []);

  const addEvent = useCallback(
    (event: ActivityEvent) => {
      setEvents((prev) => {
        // Deduplicate by id and keep bounded
        if (prev.some((e) => e.id === event.id)) return prev;
        const next = [event, ...prev];
        return next.length > maxEvents ? next.slice(0, maxEvents) : next;
      });
    },
    [maxEvents]
  );

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let es: EventSource | null = null;

    async function connect() {
      setStatus("connecting");
      setError(null);

      try {
        // Fetch a fresh Firebase ID token
        const user = auth.currentUser;
        if (!user) {
          setStatus("error");
          setError("Not authenticated");
          return;
        }

        const token = await user.getIdToken(/* forceRefresh */ false);
        if (cancelled) return;

        const url = `${API_BASE_URL}/api/admin/activity-feed?token=${encodeURIComponent(token)}`;
        es = new EventSource(url);
        esRef.current = es;

        es.onopen = () => {
          if (!cancelled) {
            setStatus("connected");
            setError(null);
          }
        };

        es.onerror = () => {
          if (!cancelled) {
            // EventSource will try to reconnect automatically.
            // Show "reconnecting" but don't surface an error unless it's permanent.
            setStatus("reconnecting");
          }
        };

        // Generic message handler (for events without a named type)
        es.onmessage = (e) => {
          try {
            const event: ActivityEvent = JSON.parse(e.data);
            if (!cancelled) addEvent(event);
          } catch {
            // ignore parse errors
          }
        };

        // Typed event listeners
        const TYPED_EVENTS: ActivityEventType[] = [
          "connected",
          "report_submitted",
          "status_changed",
          "report_assigned",
          "ai_review_complete",
          "report_resolved",
          "report_rejected",
        ];

        for (const type of TYPED_EVENTS) {
          es.addEventListener(type, (e: MessageEvent) => {
            try {
              const event: ActivityEvent = JSON.parse(e.data);
              if (!cancelled) {
                if (type === "connected") {
                  setStatus("connected");
                } else {
                  addEvent(event);
                }
              }
            } catch {
              // ignore
            }
          });
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setError(err instanceof Error ? err.message : "Connection failed");
        }
      }
    }

    connect();

    cleanupRef.current = () => {
      cancelled = true;
      if (es) {
        es.close();
        es = null;
      }
      esRef.current = null;
    };

    return () => {
      cleanupRef.current?.();
      setStatus("closed");
    };
  }, [enabled, addEvent]);

  return { events, status, error, clearEvents };
}

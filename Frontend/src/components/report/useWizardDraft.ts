import { useEffect, useRef } from "react";

const DRAFT_KEY = "cleansight-report-draft";

/* ── Types ──────────────────────────────────────────────────────── */

export interface WizardDraftState {
  currentStep: number;
  selectedType: string | null;
  selectedUrgency: string | null;
  description: string;
  imageThumbnail: string | null;
  imageFileName: string | null;
  location: { lat: number; lng: number } | null;
  showMapPicker: boolean;
}

/* ── Read / Write / Clear ───────────────────────────────────────── */

export function loadDraft(): WizardDraftState | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WizardDraftState;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  sessionStorage.removeItem(DRAFT_KEY);
}

/* ── Thumbnail generator ────────────────────────────────────────── */

/**
 * Resize a data-URL image to a small JPEG thumbnail (≤ ~30 KB)
 * suitable for session-storage persistence.
 */
export function createThumbnail(
  dataUrl: string,
  maxSize = 200,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.6));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/* ── Auto-save hook ─────────────────────────────────────────────── */

/**
 * Debounced (300 ms) auto-save of wizard state into sessionStorage.
 * Uses JSON.stringify of the full state object as the change trigger.
 */
export function useAutoSaveDraft(state: WizardDraftState): void {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const serialized = JSON.stringify(state);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        sessionStorage.setItem(DRAFT_KEY, serialized);
      } catch {
        /* quota exceeded — silently ignore */
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [serialized]);
}

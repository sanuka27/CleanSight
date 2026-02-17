/**
 * Frontend date-range utilities for analytics query params.
 */

import type { AnalyticsPreset, AnalyticsQueryParams } from "@/types/analytics";

/** Available preset options. */
export const PRESETS: { label: string; value: AnalyticsPreset }[] = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
];

/**
 * Build query params from a preset string.
 */
export function fromPreset(preset: AnalyticsPreset): AnalyticsQueryParams {
  return { preset };
}

/**
 * Build query params from explicit ISO date strings.
 */
export function fromRange(from: string, to: string): AnalyticsQueryParams {
  return { from, to };
}

/**
 * Return a human-readable label for a preset.
 */
export function presetLabel(preset: AnalyticsPreset): string {
  return PRESETS.find((p) => p.value === preset)?.label ?? preset;
}

/**
 * Get the default query params (7d preset).
 */
export function defaultParams(): AnalyticsQueryParams {
  return { preset: "7d" };
}

/**
 * Telemetry becomes words before it reaches the model.
 *
 * Jev underperforms on numeric representations and does not count reliably, so a
 * raw action log ("dwellMs: 41200", "visits: 7") is the wrong input. The library
 * projects each signal onto a named band instead, and those band names are what
 * questions reason about.
 */

export type TimeSpentBand = 'very short' | 'short' | 'medium' | 'long' | 'very long';
export type FamiliarityBand = 'first visit' | 'returning' | 'returns often';
export type ProgressBand = 'just started' | 'partway through' | 'near the end';

export function bucketTimeSpent(ms: number): TimeSpentBand {
  if (Number.isNaN(ms) || ms < 2_000) return 'very short';
  if (ms < 10_000) return 'short';
  if (ms < 30_000) return 'medium';
  if (ms < 120_000) return 'long';
  return 'very long';
}

/**
 * Bands for values the library does not collect itself. Put the result in your own
 * `app.*` field — these are here so your fields read the same way the built-in ones do.
 */
export function bucketFamiliarity(visits: number): FamiliarityBand {
  if (Number.isNaN(visits) || visits <= 1) return 'first visit';
  if (visits <= 4) return 'returning';
  return 'returns often';
}

export function bucketProgress(ratio: number): ProgressBand {
  if (Number.isNaN(ratio) || ratio < 0.34) return 'just started';
  if (ratio < 0.8) return 'partway through';
  return 'near the end';
}

/** Keep the action log short: the last `cap` labels, oldest first. */
export function capRecent(labels: readonly string[], cap = 12): string[] {
  return labels.slice(Math.max(0, labels.length - cap));
}

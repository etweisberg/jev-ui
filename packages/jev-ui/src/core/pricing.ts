/**
 * Jev bills per input token; output tokens are free. The published rate is quoted as
 * dollars per billion input tokens, which is the same number as cents per ten million —
 * small enough that the interesting figure is usually "per thousand renders", not
 * "per render".
 *
 * Prices change. Override them through `createResolver({ pricing })` rather than
 * trusting this table.
 */
export interface ModelPrice {
  /** USD per million input tokens. */
  inputPerMtokUsd: number;
  /** USD per million output tokens. Zero for every current Jev model. */
  outputPerMtokUsd?: number;
}

export const DEFAULT_PRICING: Record<string, ModelPrice> = {
  // $42 per billion input tokens.
  'jev-1.13.0': { inputPerMtokUsd: 0.042, outputPerMtokUsd: 0 },
};

export const FALLBACK_PRICE: ModelPrice = { inputPerMtokUsd: 0.042, outputPerMtokUsd: 0 };

export interface Usage {
  inputTokens?: number;
  outputTokens?: number;
}

export function priceFor(
  model: string | undefined,
  pricing: Record<string, ModelPrice> = DEFAULT_PRICING,
): ModelPrice {
  if (!model) return FALLBACK_PRICE;
  return pricing[model] ?? FALLBACK_PRICE;
}

/** USD for one request. Returns undefined when token counts are unknown. */
export function costOf(
  usage: Usage | undefined,
  model: string | undefined,
  pricing?: Record<string, ModelPrice>,
): number | undefined {
  if (!usage || usage.inputTokens === undefined) return undefined;
  const price = priceFor(model, pricing);
  const input = (usage.inputTokens / 1_000_000) * price.inputPerMtokUsd;
  const output = ((usage.outputTokens ?? 0) / 1_000_000) * (price.outputPerMtokUsd ?? 0);
  return input + output;
}

/**
 * Formats a cost small enough that most renders round to zero at cent precision.
 * Shows the per-thousand figure too, because that is the number people can reason about.
 */
export function formatCost(usd: number | undefined): string {
  if (usd === undefined) return '—';
  if (usd === 0) return '$0';
  if (usd >= 0.01) return `$${usd.toFixed(4)}`;
  // Below the precision we print, say so rather than claiming zero.
  if (usd < 1e-7) return '<$0.0000001';
  // Trim trailing zeros, but never leave a bare decimal point behind.
  const trimmed = usd.toFixed(7).replace(/0+$/, '').replace(/\.$/, '');
  return `$${trimmed}`;
}

export function formatPerThousand(usd: number | undefined): string {
  if (usd === undefined) return '—';
  return `$${(usd * 1000).toFixed(2)} / 1k`;
}

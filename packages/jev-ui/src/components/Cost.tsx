'use client';

import type { DecisionCost } from '../core/batch.js';
import { formatCost, formatPerThousand } from '../core/pricing.js';

export interface JevCostProps {
  cost?: DecisionCost;
  /** Show the whole request's cost rather than this decision's share of it. */
  batch?: boolean;
  label?: string;
}

/**
 * What a rendering decision cost.
 *
 * The share is the request's cost divided by the number of questions that travelled in
 * it — an attribution rather than a measurement, because the API bills per request. That
 * division is the point: the marginal question is close to free, so the honest figure to
 * look at is the request total and the per-thousand rate.
 */
export function JevCost({ cost, batch = false, label = 'cost' }: JevCostProps) {
  if (!cost) {
    return (
      <span data-jev-cost data-jev-cost-state="pending" style={{ opacity: 0.55 }}>
        {label} —
      </span>
    );
  }

  const usd = batch ? cost.batchUsd : cost.shareUsd;
  const known = usd !== undefined;

  return (
    <span
      data-jev-cost
      data-jev-cost-state={known ? 'known' : 'unknown'}
      data-jev-cost-usd={usd ?? ''}
      style={{ display: 'inline-flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}
    >
      <span style={{ opacity: 0.6 }}>{label}</span>
      <span data-jev-cost-value>
        {cost.estimated && known ? '≈' : ''}
        {formatCost(usd)}
      </span>
      {known ? <span style={{ opacity: 0.6 }}>{formatPerThousand(usd)}</span> : null}
      <span style={{ opacity: 0.6 }}>
        {cost.requests} req · {cost.decisions} {cost.decisions === 1 ? 'question' : 'questions'}
        {cost.inputTokens === undefined ? '' : ` · ${cost.inputTokens} tok`}
      </span>
    </span>
  );
}

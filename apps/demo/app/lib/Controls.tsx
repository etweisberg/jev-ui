'use client';

import type { ReactNode } from 'react';

/**
 * One labelled group of mutually exclusive choices.
 *
 * Several unlabelled rows of chips read as one undifferentiated set, so there is no way
 * to tell which selections combine and which replace each other.
 */
export function ControlGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      data-testid={`group-${label.toLowerCase().replace(/\s+/g, '-')}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 6,
        padding: '10px 12px',
        border: '1px solid var(--line-soft)',
        borderRadius: 8,
      }}
    >
      <div style={{ fontSize: 9.5, letterSpacing: '0.16em', color: 'var(--muted)' }}>
        {label.toUpperCase()}
        {hint ? (
          <span style={{ letterSpacing: 0, textTransform: 'none' }}> — pick one · {hint}</span>
        ) : (
          <span style={{ letterSpacing: 0, textTransform: 'none' }}> — pick one</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{children}</div>
    </div>
  );
}

/** A group of controls that change how the answer is used, not what is asked. */
export function CodeOnlyGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      data-testid={`group-${label.toLowerCase().replace(/\s+/g, '-')}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 6,
        padding: '10px 12px',
        border: '1px dashed var(--line)',
        borderRadius: 8,
      }}
    >
      <div style={{ fontSize: 9.5, letterSpacing: '0.16em', color: 'var(--muted)' }}>
        {label.toUpperCase()}
        <span style={{ letterSpacing: 0, textTransform: 'none' }}>
          {' '}
          — applied in code, no new request
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{children}</div>
    </div>
  );
}

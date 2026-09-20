'use client';

import { JevAnswers, JevCost, JevMeta, JevRequest, useJev, type DecisionCost } from 'jev-ui';
import { useState, type ReactNode } from 'react';
import { usePick } from './PickContext';

export interface MappingRow {
  /** What you write in JSX. */
  code: string;
  /** Where it lands in the question object. */
  becomes: string;
  note?: string;
}

const TABS = ['code', 'question', 'state'] as const;
type Tab = (typeof TABS)[number];

export function DemoTabs({
  source,
  sourcePath,
  mapping,
  primitive,
  liveEnabled,
}: {
  source: string;
  sourcePath: string;
  mapping: MappingRow[];
  primitive: string;
  /** Whether this demo's snippet has controls wired to it. */
  liveEnabled?: boolean;
}) {
  const [tab, setTab] = useState<Tab>('code');
  const { rewrites } = usePick();

  // Lines the controls rewrite are shown with the live value, and marked, so the snippet
  // always reflects what is actually being sent.
  const lines = source.split('\n').map((line) => {
    const hit = liveEnabled ? rewrites.find((rewrite) => line.includes(rewrite.find)) : undefined;
    return hit ? { text: line.replace(hit.find, hit.replace), live: true } : { text: line, live: false };
  });

  return (
    <section>
      <div style={{ display: 'flex', gap: 2, marginBottom: 12, flexWrap: 'wrap' }}>
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            className="ctl"
            aria-pressed={tab === name}
            data-testid={`tab-${name}`}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>

      {tab === 'code' ? (
        <div>
          <StateAsCode />
          <h2 style={{ marginTop: 22 }}>
            the component
            <span style={{ letterSpacing: 0, textTransform: 'none', marginLeft: 8 }}>
              {sourcePath}
            </span>
          </h2>
          <pre className="src" data-testid="demo-source">
            {lines.map((line, index) =>
              line.live ? (
                <span
                  key={index}
                  data-testid="live-line"
                  style={{ color: 'var(--accent)', display: 'block' }}
                >
                  {line.text}
                  <span style={{ opacity: 0.65 }}>{'   ← set by the controls above'}</span>
                </span>
              ) : (
                <span key={index} style={{ display: 'block' }}>
                  {line.text}
                </span>
              ),
            )}
          </pre>
        </div>
      ) : null}

      {tab === 'question' ? (
        <div data-testid="tab-question-panel">
          <h2>how {primitive} becomes a question</h2>
          <div
            style={{
              border: '1px solid var(--line)',
              borderRadius: 8,
              overflow: 'hidden',
              marginBottom: 16,
            }}
          >
            {mapping.map((row, index) => (
              <div
                key={row.code}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 18px 1fr',
                  gap: 10,
                  alignItems: 'baseline',
                  padding: '10px 14px',
                  background: 'var(--panel)',
                  borderTop: index === 0 ? 'none' : '1px solid var(--line-soft)',
                }}
              >
                <code style={{ fontSize: 11 }}>{row.code}</code>
                <span style={{ color: 'var(--muted)', textAlign: 'center' }}>→</span>
                <span>
                  <code style={{ fontSize: 11, color: 'var(--accent)' }}>{row.becomes}</code>
                  {row.note ? (
                    <span style={{ display: 'block', fontSize: 10.5, color: 'var(--muted)' }}>
                      {row.note}
                    </span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
          <JevRequest show="questions" />
        </div>
      ) : null}

      {tab === 'state' ? (
        <div data-testid="tab-state-panel">
          <h2>the state this request carried</h2>
          <p className="blurb" style={{ marginBottom: 14 }}>
            Only the channels a question names by backticked path are here. Everything else
            in the editor stayed in the browser — that scoping is deliberate, because
            accuracy degrades on a large state full of irrelevant detail.
          </p>
          <JevRequest show="state" />
        </div>
      ) : null}
    </section>
  );
}

/**
 * The live state, written as the provider code that would produce it.
 *
 * Adding a field in the editor is otherwise invisible in the snippet, because the
 * provider lives in a layout rather than in the demo file. This closes that gap: change
 * the controls and the code you would have to write changes with them.
 */
function StateAsCode() {
  const { state } = useJev();
  const app = (state.app ?? {}) as Record<string, unknown>;
  const entries = Object.entries(app);

  const appLine = entries.length
    ? `{ ${entries.map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(', ')} }`
    : '{}';
  const recent = state.recent_actions ?? [];
  const recentLine = recent.length ? JSON.stringify(recent) : '[]';

  const code = [
    '// app/providers.tsx — the state every question on this page receives',
    '<JevProvider',
    '  resolve={askJev}',
    `  scope={{ app: ${appLine} }}`,
    `  initialAmbient={{ recent_actions: ${recentLine}, time_spent: ${JSON.stringify(state.time_spent ?? '')} }}`,
    '>',
  ].join('\n');

  return (
    <div data-testid="state-as-code">
      <h2>
        your state, as code
        <span style={{ letterSpacing: 0, textTransform: 'none', marginLeft: 8, color: 'var(--accent)' }}>
          generated from the editor on the right
        </span>
      </h2>
      <pre className="src" style={{ color: 'var(--accent)' }}>
        {code}
      </pre>
    </div>
  );
}

/** What the judgment returned, immediately under the thing it decided. */
export function AnswerStrip({
  cost,
  legend,
  children,
}: {
  cost?: DecisionCost;
  /** Decision id -> what it controls on screen. */
  legend?: Record<string, string>;
  children?: ReactNode;
}) {
  const { inflight } = useJev();
  return (
    <section
      className="card"
      data-testid="answer-strip"
      style={{ padding: 14, display: 'grid', gap: 10 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>what the judgment returned</h2>
        <span style={{ fontSize: 10.5, color: 'var(--muted)' }} data-testid="cost-strip">
          <JevCost cost={cost} label="this render" />
        </span>
      </div>
      {children}
      <JevAnswers title="" {...(legend ? { legend } : {})} />
      <div style={{ fontSize: 10.5, color: 'var(--muted)', opacity: inflight > 0 ? 1 : 0.7 }}>
        <JevMeta />
      </div>
    </section>
  );
}

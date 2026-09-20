'use client';

import { Rank, useJev, type DecisionCost } from 'jev-ui';
import { useState } from 'react';
// docs:omit demo scaffolding — answer panel, mock pages, and the grading levels
import { AnswerStrip } from '../lib/DemoTabs';
import { usePick } from '../lib/PickContext';
import { CodeOnlyGroup, ControlGroup } from '../lib/Controls';

interface Card {
  id: string;
  title: string;
  kind: string;
}

/** Page one and page two, both fetched by code. The judgment only orders them. */
const PAGES: Card[][] = [
  [
    { id: 'p1a', title: 'EMEA pipeline coverage slipped 8% this week', kind: 'alert' },
    { id: 'p1b', title: 'How to read the revenue waterfall chart', kind: 'guide' },
    { id: 'p1c', title: 'Three accounts moved to closed-won', kind: 'activity' },
    { id: 'p1d', title: 'New: schedule exports to Slack', kind: 'release' },
    { id: 'p1e', title: 'Your CSV import finished with 12 rejected rows', kind: 'alert' },
    { id: 'p1f', title: 'Quarterly planning template', kind: 'guide' },
  ],
  [
    { id: 'p2a', title: 'APAC bookings are up 14% quarter over quarter', kind: 'activity' },
    { id: 'p2b', title: 'Fixing malformed dates before import', kind: 'guide' },
    { id: 'p2c', title: 'Two invoices are overdue past 60 days', kind: 'alert' },
    { id: 'p2d', title: 'Dark mode is now available', kind: 'release' },
    { id: 'p2e', title: 'Retry a failed import without re-uploading', kind: 'guide' },
    { id: 'p2f', title: 'Headcount plan approved for Q1', kind: 'activity' },
  ],
];

const INTERESTS = [
  {
    id: 'import',
    label: 'fighting an import',
    recent: ['uploaded contacts.csv', 'import failed: 12 rows rejected', 'opened import log'],
  },
  {
    id: 'revenue',
    label: 'reading revenue',
    recent: ['opened Q3 revenue', 'filtered to EMEA', 'compared against plan'],
  },
];

const LEVELS = [
  'Unrelated to what the person has been doing',
  'Same product area, but not what they are working on',
  'Clearly useful for what they are working on',
  'Directly about the thing they are stuck on right now',
];
// docs:end

export function FeedDemo() {
  const { setState, state } = useJev();
  const [interest, setInterest] = useState(INTERESTS[0]!);
  const [pages, setPages] = useState(1);
  const [filter, setFilter] = useState(false);
  const [cost, setCost] = useState<DecisionCost | undefined>();
  const { pick, ask } = usePick();

  const items = PAGES.slice(0, pages).flat();

  return (
    <>
      <section className="card" data-testid="demo-live" style={{ display: 'grid', gap: 14 }}>
      {/* docs:omit the controls that drive the demo */}
      <ControlGroup label="what they have been doing" hint="what each Score reads as `recent_actions`">
        {INTERESTS.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            className="ctl"
            role="radio"
            aria-checked={candidate.id === interest.id}
            aria-pressed={candidate.id === interest.id}
            data-testid={`interest-${candidate.id}`}
            onClick={() => {
              setInterest(candidate);
              setState({ recent_actions: candidate.recent });
            }}
          >
            {candidate.label}
          </button>
        ))}
      </ControlGroup>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="ctl"
          data-testid="load-more"
          disabled={pages >= PAGES.length}
          onClick={() => setPages((value) => Math.min(PAGES.length, value + 1))}
        >
          load page {Math.min(PAGES.length, pages + 1)}
        </button>
      </div>
      <CodeOnlyGroup label="minScore">
        <button
          type="button"
          className="ctl"
          aria-pressed={filter}
          data-testid="toggle-filter"
          onClick={() => setFilter((value) => !value)}
        >
          drop weak matches
        </button>
      </CodeOnlyGroup>
      {/* docs:end */}

      <div style={{ fontSize: 13, color: 'var(--muted)' }} data-testid="feed-recent">
        recent: {(state.recent_actions ?? []).join(' → ') || '(nothing yet)'} · {items.length} cards fetched
      </div>

      <Rank
        id="feed"
        items={items}
        idOf={(card) => card.id}
        labelOf={(card) => `[${card.kind}] ${card.title}`}
        mode="grade"
        levels={LEVELS}
        minScore={filter ? 0.5 : undefined}
        pick={pick}
        onResolved={setCost}
        ask={ask}
      >
        {(ranked, meta) => (
          <ul data-testid="feed" data-status={meta.status} style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {ranked.map((entry) => (
              <li
                key={entry.id}
                data-testid={`card-${entry.id}`}
                style={{
                  padding: '8px 10px',
                  marginBottom: 6,
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                  // Grade scores are comparable, so they can drive presentation directly.
                  opacity: 0.55 + entry.score * 0.45,
                }}
              >
                <span style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)' }}>
                  {entry.item.kind}
                </span>
                <div>{entry.item.title}</div>
                <span style={{ fontSize: 11, color: 'var(--muted)' }} data-testid={`score-${entry.id}`}>
                  {entry.score.toFixed(3)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Rank>
      </section>

      {/* docs:omit */}
      <AnswerStrip cost={cost} />
      {/* docs:end */}
    </>
  );
}

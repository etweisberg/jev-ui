'use client';

import { Rank, useJev, type DecisionCost } from 'jev-ui';
import { useState } from 'react';
// docs:omit demo scaffolding — answer panel and the menu catalogue
import { AnswerStrip } from '../lib/DemoTabs';
import { usePick } from '../lib/PickContext';
import { CodeOnlyGroup, ControlGroup } from '../lib/Controls';

interface Action {
  id: string;
  label: string;
  hint: string;
}

const ACTIONS: Action[] = [
  { id: 'new_report', label: 'New report', hint: 'Start a blank report from scratch' },
  { id: 'open_recent', label: 'Open recent', hint: 'Reopen a report from the last few days' },
  { id: 'export_csv', label: 'Export CSV', hint: 'Download the current view as a spreadsheet' },
  { id: 'schedule', label: 'Schedule delivery', hint: 'Email this report on a recurring basis' },
  { id: 'share', label: 'Share with team', hint: 'Grant teammates access to this report' },
  { id: 'retry_import', label: 'Retry import', hint: 'Run the last failed data import again' },
  { id: 'view_errors', label: 'View import errors', hint: 'Inspect rows that failed to load' },
  { id: 'settings', label: 'Workspace settings', hint: 'Change billing, members, and defaults' },
];

const SITUATIONS = [
  { id: 'fresh', label: 'fresh session', recent: [] as string[] },
  {
    id: 'exported',
    label: 'just exported',
    recent: ['opened Q3 revenue', 'filtered to EMEA', 'exported CSV'],
  },
  {
    id: 'import-failed',
    label: 'import just failed',
    recent: ['uploaded contacts.csv', 'import failed: 12 rows rejected'],
  },
];
// docs:end

export function DropdownDemo() {
  const { setState, state } = useJev();
  const [situation, setSituation] = useState(SITUATIONS[0]!);
  const [protectOrder, setProtectOrder] = useState(true);
  const [cost, setCost] = useState<DecisionCost | undefined>();
  const { pick, ask } = usePick();

  function choose(next: (typeof SITUATIONS)[number]) {
    setSituation(next);
    // Absolute, not appended: a deterministic action log keeps fixtures replayable.
    setState({ recent_actions: next.recent });
  }

  return (
    <>
      <section className="card" data-testid="demo-live" style={{ display: 'grid', gap: 14 }}>
      {/* docs:omit the controls that drive the demo */}
      <ControlGroup label="what they just did" hint="what the Rank reads as `recent_actions`">
        {SITUATIONS.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            className="ctl"
            role="radio"
            aria-checked={candidate.id === situation.id}
            aria-pressed={candidate.id === situation.id}
            data-testid={`situation-${candidate.id}`}
            onClick={() => choose(candidate)}
          >
            {candidate.label}
          </button>
        ))}
      </ControlGroup>
      <CodeOnlyGroup label="pinTop">
        <button
          type="button"
          className="ctl"
          aria-pressed={protectOrder}
          data-testid="toggle-pin"
          onClick={() => setProtectOrder((value) => !value)}
        >
          pinTop {protectOrder ? '2' : '0'}
        </button>
      </CodeOnlyGroup>
      {/* docs:end */}

      <div style={{ fontSize: 13, color: 'var(--muted)' }} data-testid="dropdown-recent">
        recent: {(state.recent_actions ?? []).length > 0 ? (state.recent_actions ?? []).join(' → ') : '(nothing yet)'}
      </div>

      <Rank
        id="menu_order"
        items={ACTIONS}
        idOf={(action) => action.id}
        labelOf={(action) => `${action.label} — ${action.hint}`}
        mode="compete"
        pinTop={protectOrder ? 2 : 0}
        pick={pick}
        onResolved={setCost}
        ask={ask}
      >
        {(ranked, meta) => (
          <ol data-testid="menu" data-status={meta.status} style={{ margin: 0, paddingLeft: 20 }}>
            {ranked.map((entry) => (
              <li key={entry.id} data-testid={`menu-item-${entry.id}`} style={{ marginBottom: 4 }}>
                <span style={{ fontWeight: entry.pinned ? 400 : 600 }}>{entry.item.label}</span>
                {entry.pinned ? (
                  <span style={{ fontSize: 11, color: 'var(--muted)' }} data-testid={`pinned-${entry.id}`}>
                    {' '}
                    · pinned
                  </span>
                ) : null}
                <span style={{ fontSize: 11, color: 'var(--muted)' }}> · {entry.score.toFixed(3)}</span>
              </li>
            ))}
          </ol>
        )}
      </Rank>
      </section>

      {/* docs:omit */}
      <AnswerStrip cost={cost} legend={{ menu_order: 'the order the menu is listed in' }} />
      {/* docs:end */}
    </>
  );
}

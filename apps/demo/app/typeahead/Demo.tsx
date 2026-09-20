'use client';

import { Rank, type DecisionCost } from 'jev-ui';
import { useEffect, useState } from 'react';
// docs:omit demo scaffolding — answer panel and the command catalogue
import { AnswerStrip } from '../lib/DemoTabs';
import { usePick } from '../lib/PickContext';

interface Command {
  id: string;
  label: string;
  where: string;
}

const COMMANDS: Command[] = [
  { id: 'billing_card', label: 'Change the card we bill', where: 'Settings → Billing' },
  { id: 'billing_invoices', label: 'Download past invoices', where: 'Settings → Billing → History' },
  { id: 'billing_plan', label: 'Switch plan', where: 'Settings → Billing → Plan' },
  { id: 'profile_email', label: 'Change your email address', where: 'Settings → Profile' },
  { id: 'export_csv', label: 'Export the current view', where: 'Reports → Export' },
  { id: 'export_schedule', label: 'Schedule a recurring export', where: 'Reports → Schedule' },
  { id: 'revenue_report', label: 'Open the revenue report', where: 'Reports → Revenue' },
  { id: 'users_invite', label: 'Invite a teammate', where: 'Settings → Members' },
  { id: 'users_roles', label: 'Change who can see what', where: 'Settings → Roles' },
  { id: 'api_keys', label: 'Rotate an API key', where: 'Settings → Developers' },
];

/** Prefixes with recorded fixtures, so the demo works offline as well as live. */
const SUGGESTED = ['bil', 'exp', 'who', 'card'];

function Catalogue() {
  return (
    <div data-testid="typeahead-empty">
      <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: 8 }}>
        ALL {COMMANDS.length} COMMANDS — NOTHING TO RANK UNTIL YOU TYPE
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {COMMANDS.map((command) => (
          <li key={command.id} data-testid={`catalogue-${command.id}`} style={{ padding: '4px 0', color: 'var(--muted)' }}>
            {command.label}
            <span style={{ fontSize: 10.5 }}> — {command.where}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Suggestion({ item, score, top }: { item: Command; score: number; top: boolean }) {
  return (
    <li
      data-testid={`suggestion-${item.id}`}
      style={{
        padding: '7px 10px',
        borderRadius: 6,
        background: top ? 'var(--raise)' : 'transparent',
        border: `1px solid ${top ? 'var(--line)' : 'transparent'}`,
        marginBottom: 3,
      }}
    >
      <span style={{ fontWeight: top ? 600 : 400 }}>{item.label}</span>
      <span style={{ fontSize: 10.5, color: 'var(--muted)' }}> — {item.where}</span>
      <span style={{ fontSize: 10, color: 'var(--muted)' }}> · {score.toFixed(3)}</span>
    </li>
  );
}
// docs:end

/**
 * Ordinary substring matching, in code. This is the candidate set; the model's only job
 * is choosing which of these the person meant. Jev does not generate text, and a
 * completion it invented would not be a real destination anyway.
 */
function candidatesFor(query: string): Command[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return [];
  const matches = COMMANDS.filter((command) =>
    `${command.label} ${command.where}`.toLowerCase().includes(needle),
  );
  return matches.length > 0 ? matches : COMMANDS;
}

export function TypeaheadDemo() {
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [cost, setCost] = useState<DecisionCost | undefined>();
  const { pick, ask } = usePick();

  // Debounced: a judgment per settled pause, not one per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text), 300);
    return () => clearTimeout(timer);
  }, [text]);

  const candidates = candidatesFor(query);

  return (
    <>
      <section className="card" data-testid="demo-live" style={{ display: 'grid', gap: 14 }}>
        {/* docs:omit the controls that drive the demo */}

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em' }}>RECORDED:</span>
          {SUGGESTED.map((candidate) => (
            <button
              key={candidate}
              type="button"
              className="ctl"
              aria-pressed={candidate === query}
              data-testid={`query-${candidate}`}
              onClick={() => setText(candidate)}
            >
              {candidate}
            </button>
          ))}
          <button type="button" className="ctl" data-testid="query-clear" onClick={() => setText('')}>
            clear
          </button>
        </div>

        {/* The search box sits directly above what it produces. */}
        <input
          className="ctl"
          data-testid="typeahead-input"
          placeholder="Type what you want to do…"
          aria-label="Command search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          style={{ width: '100%', fontSize: 14, padding: '10px 12px', marginBottom: -6 }}
        />
        {/* docs:end */}

        {candidates.length === 0 ? (
          <Catalogue />
        ) : (
          <>
            <div style={{ fontSize: 10.5, color: 'var(--muted)' }} data-testid="candidate-count">
              {candidates.length} candidates found in code, ranked by one question
            </div>
            <Rank
              id="completion"
              items={candidates}
              idOf={(command) => command.id}
              labelOf={(command) => `${command.label} (${command.where})`}
              mode="compete"
              take={4}
              data={{ typed: query }}
              pick={pick}
              onResolved={setCost}
              ask={ask}
            >
              {(ranked, meta) => (
                <ul data-testid="suggestions" data-status={meta.status} style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {ranked.map((entry, index) => (
                    <Suggestion key={entry.id} item={entry.item} score={entry.score} top={index === 0} />
                  ))}
                </ul>
              )}
            </Rank>
          </>
        )}
      </section>

      {/* docs:omit */}
      <AnswerStrip cost={cost} legend={{ completion: 'which command ranks first' }} />
      {/* docs:end */}
    </>
  );
}

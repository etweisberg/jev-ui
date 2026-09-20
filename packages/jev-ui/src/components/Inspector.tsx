'use client';

import { useMemo, useState } from 'react';

import { formatCost, formatPerThousand } from '../core/pricing.js';
import type { Answer, Json, Question } from '../core/types.js';
import { useJev } from './provider.js';

/**
 * These panels read CSS custom properties so a host app can theme them, and fall back to
 * neutral values when none are set: --jev-bg, --jev-fg, --jev-muted, --jev-line,
 * --jev-raise, --jev-accent, --jev-radius.
 */
const panel: React.CSSProperties = {
  border: '1px solid var(--jev-line, rgba(127,127,127,0.3))',
  borderRadius: 'var(--jev-radius, 8px)',
  padding: 16,
  fontSize: 11.5,
  fontFamily: 'inherit',
  background: 'var(--jev-bg, transparent)',
  color: 'var(--jev-fg, inherit)',
  lineHeight: 1.65,
};
const heading: React.CSSProperties = {
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.16em',
  fontSize: 9.5,
  color: 'var(--jev-muted, #888)',
  margin: '0 0 8px',
};
const pre: React.CSSProperties = {
  margin: 0,
  padding: 10,
  overflowX: 'auto',
  background: 'var(--jev-raise, rgba(127,127,127,0.08))',
  border: '1px solid var(--jev-line, rgba(127,127,127,0.2))',
  borderRadius: 'calc(var(--jev-radius, 8px) - 2px)',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  fontSize: 10.5,
  lineHeight: 1.6,
};
const control: React.CSSProperties = {
  width: '100%',
  font: 'inherit',
  fontSize: 11,
  padding: '4px 8px',
  borderRadius: 'calc(var(--jev-radius, 8px) - 2px)',
  border: '1px solid var(--jev-line, rgba(127,127,127,0.3))',
  background: 'var(--jev-raise, transparent)',
  color: 'inherit',
};
const chip: React.CSSProperties = {
  ...control,
  width: 'auto',
  cursor: 'pointer',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  fontSize: 9.5,
  padding: '5px 10px',
  color: 'var(--jev-muted, inherit)',
};
const label: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: '0.06em',
  color: 'var(--jev-muted, #888)',
};
const tag: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  padding: '1px 6px',
  borderRadius: 999,
  border: '1px solid var(--jev-line, rgba(127,127,127,0.3))',
  color: 'var(--jev-muted, #888)',
  whiteSpace: 'nowrap',
};

function Bar({ value }: { value: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 46,
        height: 3,
        borderRadius: 2,
        background: 'var(--jev-line, rgba(127,127,127,0.3))',
        overflow: 'hidden',
        verticalAlign: 'middle',
        marginRight: 6,
      }}
    >
      <span
        style={{
          display: 'block',
          width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`,
          height: '100%',
          background: 'var(--jev-accent, currentColor)',
        }}
      />
    </span>
  );
}

function AnswerRow({
  entry,
  describe,
}: {
  entry: { id: string; answer: Answer; question: Question };
  describe?: string;
}) {
  const { id, answer, question } = entry;

  const heading = (
    <div>
      <span style={{ letterSpacing: '0.06em' }}>{id}</span>
      {describe ? <span style={label}> — {describe}</span> : null}
    </div>
  );

  if (answer.type === 'noul') {
    return (
      <div data-jev-answer={id} style={{ marginBottom: 12 }}>
        {heading}
        <div style={{ paddingLeft: 10 }}>
          <Bar value={answer.noul} />
          <span data-jev-answer-value style={{ color: 'var(--jev-accent, inherit)' }}>
            {answer.noul >= 0.5 ? 'yes' : 'no'}
          </span>{' '}
          <span style={label}>p={answer.noul.toFixed(3)}</span>
        </div>
      </div>
    );
  }

  // Score probabilities come back keyed by level index; on its own "0.620 1" says
  // nothing, so each one is shown against the level text it belongs to.
  const levels = question.type === 'score' ? question.criteria : undefined;
  const nameOf = (key: string) => {
    if (!levels) return key;
    const index = Number(key);
    return Number.isInteger(index) && levels[index] !== undefined ? `${index} · ${levels[index]}` : key;
  };

  const entries = Object.entries(answer.probabilities).sort((a, b) => b[1] - a[1]);
  const picked =
    answer.type === 'choice'
      ? answer.choice
      : levels
        ? `${answer.score.toFixed(2)} · ${levels[Math.min(levels.length - 1, Math.max(0, Math.round(answer.score)))]}`
        : answer.score.toFixed(2);

  return (
    <div data-jev-answer={id} style={{ marginBottom: 14 }}>
      {heading}
      <div style={{ paddingLeft: 10 }}>
        <span data-jev-answer-value style={{ color: 'var(--jev-accent, inherit)' }}>{picked}</span>{' '}
        <span style={label}>conf {answer.confidence.toFixed(3)}</span>
      </div>
      <div style={{ paddingLeft: 10 }}>
        {entries.map(([key, probability]) => (
          <div key={key} style={{ color: 'var(--jev-muted, inherit)' }}>
            <Bar value={probability} />
            {probability.toFixed(3)} {nameOf(key)}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Every judgment currently on the page, newest answer first.
 *
 * `legend` maps a decision id to what it actually controls — an answer called
 * "needs_customs" means nothing to a reader who cannot see which part of the screen it
 * governs.
 */
export function JevAnswers({
  title = 'answers',
  legend,
}: {
  title?: string;
  legend?: Record<string, string>;
}) {
  const { answers } = useJev();
  const entries = Object.values(answers);
  return (
    <div data-jev-answers>
      {title ? <div style={heading}>{title}</div> : null}
      {entries.length > 0 ? (
        entries.map((entry) => (
          <AnswerRow key={entry.id} entry={entry} {...(legend?.[entry.id] ? { describe: legend[entry.id] } : {})} />
        ))
      ) : (
        <div style={{ color: 'var(--jev-muted, #888)' }}>nothing resolved yet</div>
      )}
    </div>
  );
}

/** Transport, request count, tokens and cost for the most recent request. */
export function JevMeta() {
  const { outcomes } = useJev();
  const latest = outcomes[0];
  if (!latest) {
    return (
      <div data-jev-meta style={{ color: 'var(--jev-muted, #888)' }}>
        no judgments resolved yet
      </div>
    );
  }
  const { meta } = latest;
  return (
    <div
      data-jev-meta
      style={{ color: 'var(--jev-muted, inherit)', overflowWrap: 'anywhere' }}
    >
      <span style={label}>transport</span> <code data-jev-transport>{meta.transport}</code>{' '}
      <span style={label}>requests</span> <code data-jev-requests>{meta.requests}</code>{' '}
      <span style={label}>questions</span> <code data-jev-decisions>{meta.decisions}</code>
      {meta.model ? (
        <>
          {' '}
          <span style={label}>model</span> <code>{meta.model}</code>
        </>
      ) : null}
      {meta.usage?.inputTokens !== undefined ? (
        <>
          {' '}
          <span style={label}>tokens in</span> <code data-jev-tokens>{meta.usage.inputTokens}</code>
        </>
      ) : null}
      {meta.costUsd !== undefined ? (
        <>
          {' '}
          <span style={label}>cost</span>{' '}
          <code data-jev-cost-total>
            {meta.estimated ? '≈' : ''}
            {formatCost(meta.costUsd)}
          </code>{' '}
          <span style={label}>{formatPerThousand(meta.costUsd)}</span>
        </>
      ) : null}
      {meta.ms ? (
        <>
          {' '}
          <span style={label}>elapsed</span> <code>{meta.ms}ms</code>
        </>
      ) : null}
    </div>
  );
}

/** The exact request: the state that was sent and the questions asked against it. */
export function JevRequest({ show = 'both' }: { show?: 'state' | 'questions' | 'both' }) {
  const { outcomes } = useJev();
  const latest = outcomes[0];
  return (
    <div data-jev-request>
      {show !== 'questions' ? (
        <>
          <div style={heading}>state sent</div>
          <pre style={pre} data-jev-sent-state>
            {JSON.stringify(latest?.sent.state ?? {}, null, 2)}
          </pre>
        </>
      ) : null}
      {show !== 'state' ? (
        <>
          <div style={{ ...heading, marginTop: show === 'both' ? 16 : 0 }}>questions</div>
          <pre style={pre} data-jev-questions>
            {JSON.stringify(latest?.sent.questions ?? {}, null, 2)}
          </pre>
        </>
      ) : null}
    </div>
  );
}

export interface JevInspectorProps {
  /** Include the ambient-state editor. */
  editable?: boolean;
  title?: string;
}

/** Everything at once. The parts above can be placed individually instead. */
export function JevInspector({ editable = true, title = 'inspector' }: JevInspectorProps) {
  const { outcomes, revalidate, inflight, errors } = useJev();

  return (
    <section
      style={panel}
      data-jev-inspector
      // Test hooks: wait for inflight 0, and for resolutions to tick up after an interaction.
      data-jev-inflight={inflight}
      data-jev-resolutions={outcomes.length}
      data-jev-errors={errors.length}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <strong
          style={{
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontSize: 10.5,
            fontWeight: 600,
          }}
        >
          {title}
        </strong>
        <button type="button" onClick={revalidate} style={chip}>
          re-resolve
        </button>
      </div>

      <hr
        style={{
          border: 0,
          borderTop: '1px solid var(--jev-line, rgba(127,127,127,0.25))',
          margin: '14px 0',
        }}
      />

      <JevMeta />
      <JevErrors />
      {editable ? (
        <div style={{ marginTop: 16 }}>
          <JevStateEditor />
        </div>
      ) : null}
      <div style={{ marginTop: 16 }}>
        <JevRequest />
      </div>
      <div style={{ marginTop: 16 }}>
        <JevAnswers />
      </div>
    </section>
  );
}

/** Failed judgments. Components fall back on failure, which otherwise looks like success. */
export function JevErrors() {
  const { errors } = useJev();
  if (errors.length === 0) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <div style={heading}>failed judgments</div>
      {errors.map((message, index) => (
        <pre
          key={`${index}-${message.slice(0, 24)}`}
          style={{ ...pre, borderLeft: '2px solid var(--jev-accent, crimson)' }}
          data-jev-error
        >
          {message}
        </pre>
      ))}
    </div>
  );
}

/**
 * Declared at module scope on purpose. A component defined inside another component is a
 * new type on every render, so React unmounts and remounts its subtree — which drops
 * focus out of a field after every keystroke.
 */
function FieldRow({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: 8, alignItems: 'center', marginBottom: 6 }}
      data-jev-field={name}
    >
      <label htmlFor={`jev-${name}`} style={label}>
        {name}
      </label>
      {children}
    </div>
  );
}

const TIME_SPENT = ['very short', 'short', 'medium', 'long', 'very long'];

function asObject(value: Json | undefined): Record<string, Json> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, Json>)
    : {};
}

/**
 * Edit the state a judgment sees.
 *
 * The library collects two things on its own: what the person did, and how long they
 * stayed. Everything else is yours, under `app`, with whatever keys you like.
 */
export function JevStateEditor({
  options,
}: {
  /** Render these `app.*` fields as a choice instead of a text box, e.g. { user: ['ana','rob'] }. */
  options?: Record<string, string[]>;
} = {}) {
  const { state, setState, setAppField, revalidate } = useJev();
  const [recentDraft, setRecentDraft] = useState((state.recent_actions ?? []).join('\n'));
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const app = asObject(state.app);

  function removeAppField(key: string) {
    const next = { ...app };
    delete next[key];
    setState({ app: next });
  }

  return (
    <div data-jev-state-editor>
      <div style={heading}>collected for you</div>
      <p style={{ ...label, margin: '0 0 10px', lineHeight: 1.6 }} data-jev-scope-note>
        The only two the library gathers on its own. Everything else is yours, below.
      </p>

      <FieldRow name="recent_actions">
        <div>
          <textarea
            id="jev-recent_actions"
            rows={3}
            style={{ ...control, resize: 'vertical' }}
            value={recentDraft}
            onChange={(event) => setRecentDraft(event.target.value)}
          />
          <button
            type="button"
            style={{ ...chip, marginTop: 5 }}
            data-jev-apply-recent
            onClick={() => {
              setState({
                recent_actions: recentDraft.split('\n').map((line) => line.trim()).filter(Boolean),
              });
              revalidate();
            }}
          >
            apply
          </button>
        </div>
      </FieldRow>

      <FieldRow name="time_spent">
        <select
          id="jev-time_spent"
          style={control}
          value={state.time_spent ?? ''}
          onChange={(event) => setState({ time_spent: event.target.value })}
        >
          <option value="">(unset)</option>
          {TIME_SPENT.map((band) => (
            <option key={band} value={band}>
              {band}
            </option>
          ))}
        </select>
      </FieldRow>

      <div style={{ ...heading, marginTop: 18 }}>your own fields — app.*</div>
      <p style={{ ...label, margin: '0 0 8px', lineHeight: 1.6 }}>
        Anything here travels with the request. Name it from an ask —{' '}
        <code>`app.yourField`</code> — to tell the model what it means.
      </p>

      {Object.entries(app).map(([key, value]) => (
        <div
          key={key}
          style={{ display: 'grid', gridTemplateColumns: '96px 1fr auto', gap: 8, alignItems: 'center', marginBottom: 6 }}
          data-jev-app-field={key}
        >
          <span style={label}>app.{key}</span>
          {options?.[key] ? (
            <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {options[key]!.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  style={{
                    ...chip,
                    ...(String(value) === choice
                      ? { borderColor: 'var(--jev-accent, #999)', color: 'var(--jev-accent, #999)' }
                      : {}),
                  }}
                  aria-pressed={String(value) === choice}
                  data-jev-app-option={`${key}:${choice}`}
                  onClick={() => setAppField(key, choice)}
                >
                  {choice}
                </button>
              ))}
            </span>
          ) : (
            <input
              style={control}
              value={String(value)}
              aria-label={`app.${key}`}
              onChange={(event) => setAppField(key, event.target.value)}
            />
          )}
          <button type="button" style={chip} onClick={() => removeAppField(key)} aria-label={`remove app.${key}`}>
            ×
          </button>
        </div>
      ))}

      <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr auto', gap: 8, alignItems: 'center' }}>
        <input
          style={{ ...control, width: 96 }}
          placeholder="key"
          aria-label="new field key"
          data-jev-new-key
          value={newKey}
          onChange={(event) => setNewKey(event.target.value)}
        />
        <input
          style={control}
          placeholder="value"
          aria-label="new field value"
          data-jev-new-value
          value={newValue}
          onChange={(event) => setNewValue(event.target.value)}
        />
        <button
          type="button"
          style={chip}
          data-jev-add-field
          onClick={() => {
            // The section already means app.*, so "app.tier" must not become app.app.tier.
            const key = newKey.trim().replace(/^app\./, '');
            if (!key) return;
            setAppField(key, newValue);
            setNewKey('');
            setNewValue('');
          }}
        >
          add
        </button>
      </div>
    </div>
  );
}

/**
 * A zero-chrome element carrying the resolution state of the page, for tests and tooling
 * that should not depend on a visual panel being mounted.
 */
export function JevStatus() {
  const { inflight, outcomes, errors } = useJev();
  return (
    <div
      data-jev-status
      data-jev-inflight={inflight}
      data-jev-resolutions={outcomes.length}
      data-jev-errors={errors.length}
      style={{ display: 'none' }}
    />
  );
}

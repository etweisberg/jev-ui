'use client';

import { CHANNELS, useJev, type Channel } from 'jev-ui';
import { usePick } from './PickContext';

/**
 * Chooses which state channels a question receives.
 *
 * Scoping is a real lever — a question answers better when it is not wading through
 * state that has nothing to do with it — but it is invisible unless you can see it. This
 * drives the `pick` prop, and the snippet below the demo updates to match.
 */
export function ChannelPicker({
  value,
  onChange,
}: {
  value: Channel[];
  onChange: (next: Channel[]) => void;
}) {
  const { state } = useJev();

  return (
    <div
      data-testid="channel-picker"
      style={{
        display: 'grid',
        gap: 6,
        padding: '10px 12px',
        border: '1px dashed var(--line)',
        borderRadius: 8,
      }}
    >
      <div style={{ fontSize: 9.5, letterSpacing: '0.16em', color: 'var(--muted)' }}>
        STATE THIS QUESTION RECEIVES
        <span style={{ letterSpacing: 0, textTransform: 'none' }}>
          {' '}
          — combine freely · sets the <code>pick</code> prop
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {CHANNELS.map((channel) => {
          const on = value.includes(channel);
          const empty = state[channel] === undefined;
          return (
            <button
              key={channel}
              type="button"
              className="ctl"
              aria-pressed={on}
              title={empty ? 'no value set, so nothing is sent for this channel' : undefined}
              data-testid={`pick-${channel}`}
              onClick={() =>
                onChange(
                  on ? value.filter((entry) => entry !== channel) : [...value, channel],
                )
              }
              style={empty ? { opacity: 0.45 } : undefined}
            >
              {channel}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: 'var(--muted)' }} data-testid="pick-summary">
        {value.length === CHANNELS.length
          ? 'all channels — the default, so no pick prop is needed'
          : `pick={${JSON.stringify(value)}}`}
      </div>
    </div>
  );
}

/** Edit the question itself and watch the answer, the snippet, and the cost all move. */
export function AskEditor() {
  const { ask, setAsk, defaultAsk } = usePick();
  const { state } = useJev();
  const changed = ask !== defaultAsk;

  // State does nothing until a question names it. These are the paths this page can
  // reference right now, including anything added in the editor on the right.
  const available = [
    ...(state.recent_actions ? ['recent_actions'] : []),
    ...(state.time_spent ? ['time_spent'] : []),
    ...Object.keys((state.app ?? {}) as Record<string, unknown>).map((key) => `app.${key}`),
  ];

  /**
   * Adds the path as a clause rather than tacking it on the end. Appending after the
   * question mark produces "...in `data.typed`? `app.role`", which is a worse question
   * than the one it started from — and the wording is the whole input here.
   */
  const insert = (path: string) => {
    const trimmed = ask.replace(/\s+$/, '');
    const clause = `, given \`${path}\``;
    const tail = trimmed.match(/[?.!]+$/);
    setAsk(tail ? `${trimmed.slice(0, -tail[0].length)}${clause}${tail[0]}` : `${trimmed}${clause}`);
  };
  return (
    <div
      data-testid="ask-editor"
      style={{
        display: 'grid',
        gap: 6,
        padding: '10px 12px',
        border: '1px dashed var(--line)',
        borderRadius: 8,
      }}
    >
      <div style={{ fontSize: 9.5, letterSpacing: '0.16em', color: 'var(--muted)' }}>
        THE QUESTION
        <span style={{ letterSpacing: 0, textTransform: 'none' }}>
          {' '}
          — sent as <code>instructions</code> · backticked paths scope what it reads
        </span>
      </div>
      <textarea
        className="ctl"
        aria-label="The question sent to the model"
        data-testid="ask-input"
        rows={3}
        value={ask}
        onChange={(event) => setAsk(event.target.value)}
        style={{ width: '100%', fontSize: 11, resize: 'vertical' }}
      />
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>reference state:</span>
        {available.map((path) => {
          const used = ask.includes(`\`${path}\``);
          return (
            <button
              key={path}
              type="button"
              className="ctl"
              data-testid={`insert-${path}`}
              aria-pressed={used}
              onClick={() => insert(path)}
              style={{ fontSize: 9.5, padding: '3px 7px', textTransform: 'none', letterSpacing: 0 }}
            >
              {used ? '✓ ' : '+ '}
              {path}
            </button>
          );
        })}
      </div>

      {changed ? (
        <div style={{ fontSize: 10, color: 'var(--accent)' }} data-testid="ask-changed">
          edited — this wording has no recorded answer, so it needs a live key
          <button
            type="button"
            className="ctl"
            data-testid="ask-reset"
            style={{ marginLeft: 8 }}
            onClick={() => setAsk(defaultAsk)}
          >
            reset
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** The source line the snippet swaps in, so the code matches the controls. */
export function pickExpression(value: Channel[]): string | undefined {
  if (value.length === CHANNELS.length) return undefined;
  return `pick={${JSON.stringify(value).replace(/","/g, "', '").replace(/^\["/, "['").replace(/"\]$/, "']")}}`;
}

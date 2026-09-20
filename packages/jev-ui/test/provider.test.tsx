// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Vitest does not run RTL's auto-cleanup without a setup file, so each render would
// otherwise stack up in the same document.
afterEach(cleanup);
import { JevProvider } from '../src/components/provider.js';
import { useJevState } from '../src/hooks/useJevState.js';
import type { BaseState, Decision, ResolveOutcome } from '../src/core/types.js';

const noopResolve = async (decisions: readonly Decision[]): Promise<ResolveOutcome> => ({
  answers: {},
  meta: { transport: 'test', requests: 0, decisions: decisions.length, ms: 0 },
  sent: { state: {}, questions: {} },
});

function Probe({ onReady }: { onReady?: (handle: ReturnType<typeof useJevState>) => void }) {
  const handle = useJevState();
  useEffect(() => {
    onReady?.(handle);
  });
  return <pre data-testid="state">{JSON.stringify(handle.state)}</pre>;
}

const read = () => JSON.parse(screen.getByTestId('state').textContent ?? '{}') as BaseState;

describe('the state prop is reactive', () => {
  it('flows a changed value into the state', () => {
    const { rerender } = render(
      <JevProvider resolve={noopResolve} state={{ app: { user: 'ana' } }}>
        <Probe />
      </JevProvider>,
    );
    expect(read().app).toEqual({ user: 'ana' });

    rerender(
      <JevProvider resolve={noopResolve} state={{ app: { user: 'rob' } }}>
        <Probe />
      </JevProvider>,
    );
    expect(read().app).toEqual({ user: 'rob' });
  });

  it('ignores a re-created object with identical contents', () => {
    let handle: ReturnType<typeof useJevState> | undefined;
    const { rerender } = render(
      <JevProvider resolve={noopResolve} state={{ app: { user: 'ana' } }}>
        <Probe onReady={(h) => (handle = h)} />
      </JevProvider>,
    );
    act(() => handle!.track('exported CSV'));
    expect(read().recent_actions).toEqual(['exported CSV']);

    // Same value, new object identity — must not re-sync, and must not disturb anything.
    rerender(
      <JevProvider resolve={noopResolve} state={{ app: { user: 'ana' } }}>
        <Probe onReady={(h) => (handle = h)} />
      </JevProvider>,
    );
    expect(read().recent_actions).toEqual(['exported CSV']);
  });

  it('syncs per key, so changing one field leaves the others alone', () => {
    let handle: ReturnType<typeof useJevState> | undefined;
    const { rerender } = render(
      <JevProvider resolve={noopResolve} state={{ app: { user: 'ana' }, time_spent: 'short' }}>
        <Probe onReady={(h) => (handle = h)} />
      </JevProvider>,
    );
    act(() => handle!.track('uploaded contacts.csv'));

    // Changing app must not re-apply time_spent or wipe what track() collected. Merging
    // the whole object on any change is the bug this guards.
    rerender(
      <JevProvider resolve={noopResolve} state={{ app: { user: 'rob' }, time_spent: 'short' }}>
        <Probe onReady={(h) => (handle = h)} />
      </JevProvider>,
    );
    expect(read().app).toEqual({ user: 'rob' });
    expect(read().recent_actions).toEqual(['uploaded contacts.csv']);
  });

  it('lets a field the prop owns be reset deliberately', () => {
    let handle: ReturnType<typeof useJevState> | undefined;
    const { rerender } = render(
      <JevProvider resolve={noopResolve} state={{ recent_actions: ['a'] }}>
        <Probe onReady={(h) => (handle = h)} />
      </JevProvider>,
    );
    act(() => handle!.track('b'));
    expect(read().recent_actions).toEqual(['a', 'b']);

    rerender(
      <JevProvider resolve={noopResolve} state={{ recent_actions: [] }}>
        <Probe onReady={(h) => (handle = h)} />
      </JevProvider>,
    );
    expect(read().recent_actions).toEqual([]);
  });
});

describe('onStateChange', () => {
  it('does not fire for the initial render', () => {
    const onStateChange = vi.fn();
    render(
      <JevProvider resolve={noopResolve} state={{ app: { user: 'ana' } }} onStateChange={onStateChange}>
        <Probe />
      </JevProvider>,
    );
    expect(onStateChange).not.toHaveBeenCalled();
  });

  it('fires with the new state after track()', () => {
    const onStateChange = vi.fn();
    let handle: ReturnType<typeof useJevState> | undefined;
    render(
      <JevProvider resolve={noopResolve} onStateChange={onStateChange}>
        <Probe onReady={(h) => (handle = h)} />
      </JevProvider>,
    );
    act(() => handle!.track('exported CSV'));
    expect(onStateChange).toHaveBeenCalledTimes(1);
    expect(onStateChange.mock.calls[0]![0].recent_actions).toEqual(['exported CSV']);
  });

  it('fires when the prop drives the change', () => {
    const onStateChange = vi.fn();
    const { rerender } = render(
      <JevProvider resolve={noopResolve} state={{ app: { user: 'ana' } }} onStateChange={onStateChange}>
        <Probe />
      </JevProvider>,
    );
    rerender(
      <JevProvider resolve={noopResolve} state={{ app: { user: 'rob' } }} onStateChange={onStateChange}>
        <Probe />
      </JevProvider>,
    );
    expect(onStateChange).toHaveBeenCalledTimes(1);
  });
});

describe('setAppField', () => {
  it('sets one key without disturbing the rest of app', () => {
    let handle: ReturnType<typeof useJevState> | undefined;
    render(
      <JevProvider resolve={noopResolve} state={{ app: { user: 'ana', role: 'analyst' } }}>
        <Probe onReady={(h) => (handle = h)} />
      </JevProvider>,
    );
    act(() => handle!.setAppField('tier', 'enterprise'));
    expect(read().app).toEqual({ user: 'ana', role: 'analyst', tier: 'enterprise' });
  });
});

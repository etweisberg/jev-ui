'use client';

import { CHANNELS, type Channel } from 'jev-ui';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface DemoConfig {
  pick: Channel[];
  setPick: (next: Channel[]) => void;
  /** The question text itself, editable so you can see how wording moves the answer. */
  ask: string;
  setAsk: (next: string) => void;
  defaultAsk: string;
  /** Source rewrites the snippet applies, so the code matches the controls. */
  rewrites: { find: string; replace: string }[];
}

const DemoConfigContext = createContext<DemoConfig | undefined>(undefined);

export function usePick(): DemoConfig {
  const value = useContext(DemoConfigContext);
  if (!value) throw new Error('usePick must be used inside <PickProvider>');
  return value;
}

/**
 * Holds the editable parts of one demo: which state channels the question receives, and
 * the question itself.
 *
 * It lives in context because the controls sit inside the live component while the code
 * snippet that has to reflect them sits in a sibling panel, with a server component in
 * between.
 */
export function PickProvider({ defaultAsk, children }: { defaultAsk: string; children: ReactNode }) {
  const [pick, setPick] = useState<Channel[]>([...CHANNELS]);
  const [ask, setAsk] = useState(defaultAsk);

  const value = useMemo<DemoConfig>(() => {
    const rewrites = [
      {
        find: 'pick={pick}',
        replace:
          pick.length === CHANNELS.length
            ? 'pick={undefined}   // every channel — the default'
            : `pick={[${pick.map((channel) => `'${channel}'`).join(', ')}]}`,
      },
      { find: 'ask={ask}', replace: `ask="${ask}"` },
    ];
    return { pick, setPick, ask, setAsk, defaultAsk, rewrites };
  }, [pick, ask, defaultAsk]);

  return <DemoConfigContext.Provider value={value}>{children}</DemoConfigContext.Provider>;
}

'use client';

import { useState } from 'react';
import { INSTALL } from '../docs/content';
import { CopyButton } from './CopyButton';

export function InstallTabs({ center = false }: { center?: boolean }) {
  const [manager, setManager] = useState(INSTALL[0]!.id);
  const active = INSTALL.find((entry) => entry.id === manager) ?? INSTALL[0]!;

  return (
    <div data-testid="install">
      <div
        style={{
          display: 'flex',
          gap: 2,
          marginBottom: 8,
          flexWrap: 'wrap',
          justifyContent: center ? 'center' : 'flex-start',
        }}
      >
        {INSTALL.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="ctl"
            aria-pressed={entry.id === manager}
            data-testid={`install-${entry.id}`}
            onClick={() => setManager(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <div style={{ position: 'relative' }}>
        <pre
          className="src"
          data-testid="install-command"
          style={{ fontSize: 13, textAlign: 'left', paddingRight: 104 }}
        >
          {active.add}
        </pre>
        <span style={{ position: 'absolute', top: 8, right: 8 }}>
          <CopyButton text={active.add} testId="install-copy" />
        </span>
      </div>
    </div>
  );
}

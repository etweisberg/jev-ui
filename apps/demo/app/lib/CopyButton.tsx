'use client';

import { useState } from 'react';

function ClipboardIcon({ done }: { done: boolean }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {done ? (
        <polyline points="3,8.5 6.5,12 13,4.5" />
      ) : (
        <>
          <rect x="5.5" y="2.5" width="8" height="10" rx="1.5" />
          <path d="M10.5 2.5v-.5a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h.5" />
        </>
      )}
    </svg>
  );
}

export function CopyButton({
  text,
  label = 'copy',
  doneLabel = 'copied',
  testId = 'copy',
}: {
  text: string;
  label?: string;
  doneLabel?: string;
  testId?: string;
}) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="ctl"
      data-testid={testId}
      aria-label={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          // Clipboard access can be refused; leaving the label alone is the honest result.
          setDone(false);
        }
      }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
    >
      <ClipboardIcon done={done} />
      {done ? doneLabel : label}
    </button>
  );
}

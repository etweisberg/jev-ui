'use client';

import { JevStateEditor } from 'jev-ui';
import { useState } from 'react';
import { AskEditor, ChannelPicker } from './ChannelPicker';
import { usePick } from './PickContext';

/**
 * Everything that changes the request, in one place: the question, which channels it
 * receives, and the values of those channels.
 */
export function DemoConfig() {
  const { pick, setPick } = usePick();
  const [openState, setOpenState] = useState(false);

  return (
    <section className="card" data-testid="demo-config" style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0 }}>the request</h2>
      <AskEditor />
      <ChannelPicker value={pick} onChange={setPick} />

      <div>
        <button
          type="button"
          className="ctl"
          data-testid="toggle-state-editor"
          aria-expanded={openState}
          onClick={() => setOpenState((value) => !value)}
        >
          {openState ? '▾' : '▸'} state values
        </button>
        {openState ? (
          <div style={{ marginTop: 12 }}>
            <JevStateEditor
              // Only fields with a genuinely fixed set of values. Anything else stays a
              // text box, because your own fields can hold whatever you want.
              options={{
                user: ['ana', 'rob'],
                familiarity: ['first visit', 'returning', 'returns often'],
              }}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

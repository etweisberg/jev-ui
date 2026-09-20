import { DemoShell } from '../lib/DemoShell';
import { DropdownDemo } from './Demo';

export default function DropdownPage() {
  return (
    <DemoShell
      title="Order a menu by what comes next"
      primitive='<Rank mode="compete">'
      blurb={
        <>
          One Choice over the action ids; the probability distribution <em>is</em> the order, so a
          single question ranks the whole menu. Reordering a menu fights muscle memory, which is what{' '}
          <code>pinTop</code> is for — toggle it and watch the first two slots stop moving.
        </>
      }
      sourcePath="app/dropdown/Demo.tsx"
      liveEnabled
      defaultAsk={'Which of these menu actions is the user most likely to want next, given what they just did in `recent_actions`?'}
      mapping={[
        { code: 'ask="Which of these menu actions…"', becomes: 'instructions' },
        { code: 'items + idOf', becomes: 'criteria keys', note: 'One option per candidate id.' },
        { code: 'labelOf(item)', becomes: 'criteria[id]', note: 'How the candidate is described. The model cannot pick what it cannot see.' },
        { code: '`recent`', becomes: 'state.recent', note: 'Named in the ask, so the channel travels with it.' },
        { code: 'pinTop / take', becomes: '(code, not sent)', note: 'Reshapes the answer without a new request.' },
      ]}
    >
      <DropdownDemo />
    </DemoShell>
  );
}

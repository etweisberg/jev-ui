import { DemoShell } from '../lib/DemoShell';
import { FormDemo } from './Demo';

export default function FormPage() {
  return (
    <DemoShell
      title="Reveal only the fields that apply"
      primitive="<Gate> + useScore"
      blurb={
        <>
          Three Gates (Noul) decide which optional sections appear, and <code>useScore</code> decides
          how much help text each field carries — a judgment driving props rather than a subtree. All
          four resolve in one request. Gates only ever <em>add</em> fields here: content hidden by a
          judgment is an accessibility problem, and it is invisible to whoever needed it.
        </>
      }
      sourcePath="app/form/Demo.tsx"
      liveEnabled
      defaultAsk={'Does the shipment described in `data.order` cross an international border, so that a customs declaration is required?'}
      mapping={[
        { code: '<Gate ask="Does the shipment…">', becomes: 'noul question', note: 'The probability that the answer is yes.' },
        { code: 'data={{ order }}', becomes: 'state.data.<id>.order', note: 'Namespaced per gate.' },
        { code: 'threshold={0.6}', becomes: '(code, not sent)', note: 'Where you draw the line, by consequence.' },
        { code: 'useScore({ levels })', becomes: 'score question', note: 'Ordered levels; the answer can fall between two.' },
        { code: '(four judgments)', becomes: 'one request', note: 'Registered in one tick, so they batch.' },
      ]}
    >
      <FormDemo />
    </DemoShell>
  );
}

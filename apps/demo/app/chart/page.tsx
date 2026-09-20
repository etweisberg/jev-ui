import { DemoShell } from '../lib/DemoShell';
import { ChartDemo } from './Demo';

export default function ChartPage() {
  return (
    <DemoShell
      title="Which chart answers the question"
      primitive="<Branch>"
      blurb={
        <>
          One <code>&lt;Branch&gt;</code>, four views, one fallback. The criteria on each{' '}
          <code>&lt;Option&gt;</code> are what the model actually reasons about — a bare key like
          &ldquo;chart&rdquo; would give it nothing. Below <code>minConfidence</code> the fallback
          renders instead of a guess.
        </>
      }
      sourcePath="app/chart/Demo.tsx"
      liveEnabled
      defaultAsk="Which view best answers the question in `data.question` about the revenue figures in `data.series`?"
      mapping={[
        { code: 'ask="Which view best answers…"', becomes: 'instructions', note: 'Sent verbatim. Backticked paths scope the state.' },
        { code: '<Option k="line" when="…">', becomes: 'criteria.line', note: 'The when text is the criterion; the key is what comes back.' },
        { code: '(automatic)', becomes: 'criteria.__none__', note: 'A no-match outcome, so nothing has to win.' },
        { code: 'data={{ question, series }}', becomes: 'state.data.chart_view', note: 'Namespaced by decision id so a batch can share one state.' },
        { code: 'pick={[…]}', becomes: 'which channels travel', note: 'Omit it and every channel is sent. The picker above rewrites this line.' },
        { code: 'minConfidence={0.5}', becomes: '(code, not sent)', note: 'Applied to the answer. Changing it needs no new request.' },
        { code: '<Option fallback>', becomes: '(code, not sent)', note: 'Rendered on no-match, low confidence, or failure.' },
      ]}
    >
      <ChartDemo />
    </DemoShell>
  );
}

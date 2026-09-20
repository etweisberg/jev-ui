import { DemoShell } from '../lib/DemoShell';
import { FeedDemo } from './Demo';

export default function FeedPage() {
  return (
    <DemoShell
      title="Order a page of a feed"
      primitive='<Rank mode="grade">'
      blurb={
        <>
          Grade mode fans out to one Score per card, all in a single request. Those scores are
          comparable across items <em>and across requests</em>, so page two ranks against page one —
          load it and the lists interleave. A per-page Choice could not do that, and the breakage
          would be invisible. Grade mode can also drop weak matches, which compete mode cannot:
          there, something always wins.
        </>
      }
      sourcePath="app/feed/Demo.tsx"
      liveEnabled
      defaultAsk={'How well does the feed card in `data.item` match what the person has been doing, as shown in `recent_actions`?'}
      mapping={[
        { code: 'mode="grade"', becomes: 'one score question per item', note: 'Fanned out into the same request.' },
        { code: 'labelOf(item)', becomes: 'state.data.<id>.item', note: 'Each question sees its own card.' },
        { code: 'levels={[…]}', becomes: 'criteria', note: 'Ordered levels, each describing a concrete situation.' },
        { code: '`recent`', becomes: 'state.recent', note: 'Shared by every question in the batch.' },
        { code: 'minScore={0.5}', becomes: '(code, not sent)', note: 'Filtering happens after the answers arrive.' },
      ]}
    >
      <FeedDemo />
    </DemoShell>
  );
}

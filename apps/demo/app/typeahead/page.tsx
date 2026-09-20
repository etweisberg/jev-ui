import { DemoShell } from '../lib/DemoShell';
import { TypeaheadDemo } from './Demo';

export default function TypeaheadPage() {
  return (
    <DemoShell
      title="Pick the completion they meant"
      primitive='<Rank mode="compete" take={4}>'
      blurb={
        <>
          Typeahead is not a separate primitive. Code finds the candidates with ordinary substring
          matching; the judgment only selects among them. Because compete mode&rsquo;s probabilities
          sum to one, something always ranks first — exactly what you want for &ldquo;which did they
          mean&rdquo;. Type anything: the recorded prefixes work offline, and everything else needs a
          live key.
        </>
      }
      sourcePath="app/typeahead/Demo.tsx"
      liveEnabled
      defaultAsk={'Which of these commands did the user mean by what they typed in `data.typed`?'}
      mapping={[
        { code: 'ask="…what they typed in `query`?"', becomes: 'instructions' },
        { code: 'candidatesFor(query)', becomes: 'criteria keys', note: 'Found in code. The model never invents a destination.' },
        { code: '`query`', becomes: 'state.query', note: 'The ambient channel the ask names.' },
        { code: 'take={4}', becomes: '(code, not sent)', note: 'Truncates the ranked list after the answer arrives.' },
      ]}
    >
      <TypeaheadDemo />
    </DemoShell>
  );
}

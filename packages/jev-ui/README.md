# jev-ui

Resolve which component to render, how to order a list, and whether to show an affordance —
from calibrated judgments returned by [TypeSafe](https://docs.typesafe.ai)'s Jev.

```bash
npm install jev-ui
```

## Wiring

The key stays on the server. Create a resolver in a Server Action, hand it to the provider.

```tsx
// app/actions.ts
'use server';
import { createResolver } from 'jev-ui/server';

const resolve = createResolver({ fixturesDir: './fixtures' });

export async function askJev(decisions, base) {
  return resolve(decisions, base);
}
```

```tsx
// app/providers.tsx
'use client';
import { JevProvider } from 'jev-ui';
import { askJev } from './actions';

export function Providers({ children }) {
  return (
    <JevProvider
      resolve={askJev}
      scope={{ app: { role: 'analyst', plan: 'team' } }}
      initialAmbient={{ recent: [], familiarity: 'returning' }}
    >
      {children}
    </JevProvider>
  );
}
```

## `<Branch>` — pick one subtree

```tsx
<Branch
  ask="Which view best answers the question in `data.question`?"
  data={{ question }}
  minConfidence={0.5}
>
  <Option k="line" when="The question is about a trend across many time periods.">
    <LineChart />
  </Option>
  <Option k="table" when="The question needs exact per-row numbers.">
    <Table />
  </Option>
  <Option fallback>
    <Table />
  </Option>
</Branch>
```

The `when` text becomes the Choice criteria and is the highest-leverage string in the
component — a bare key like `"chart"` gives the model nothing to reason about. A `fallback`
option is required in practice: it renders when confidence is below `minConfidence`, when
the model reports that nothing fits, or when the judgment fails.

## `<Rank>` — order, filter, truncate

Two modes, answering different questions:

```tsx
{/* compete: probabilities sum to 1, so something always wins.
    Right for "which one did they mean". */}
<Rank
  items={candidates}
  idOf={(c) => c.id}
  labelOf={(c) => c.label}
  mode="compete"
  take={4}
  pinTop={2}
  ask="Which of these commands did the user mean by what they typed in `query`?"
>
  {(ranked) => ranked.map(({ item, score, pinned }) => /* … */)}
</Rank>

{/* grade: one Score per item, comparable across items AND across requests.
    Required for filtering, and for paged lists where page 2 must rank against page 1. */}
<Rank
  items={cards}
  idOf={(c) => c.id}
  labelOf={(c) => c.title}
  mode="grade"
  levels={['Unrelated', 'Same area', 'Clearly useful', 'Exactly what they need']}
  minScore={0.5}
  ask="How well does the card in `data.item` match what the person has been doing, per `recent`?"
>
  {(ranked) => /* … */}
</Rank>
```

`pinTop` holds the leading items in place: reordering a menu fights muscle memory. Changing
`pinTop`, `take`, or `minScore` re-derives in code and spends no new request — the evidence
and the question have not changed.

## `<Gate>` — show an affordance when a condition holds

```tsx
<Gate
  ask="Does the shipment in `data.order` cross an international border?"
  data={{ order }}
  threshold={0.6}
>
  <CustomsFields />
</Gate>
```

Use gates to **add** things. Content hidden by a judgment is an accessibility and SEO
problem, and it is invisible to whoever needed it.

## `useScore` — a judgment that drives props

```tsx
const guidance = useScore({
  ask: 'How much explanation does this person need, given `familiarity`?',
  levels: ['Knows this well', 'Needs a reminder', 'New to this'],
});

const verbose = guidance.normalized >= 0.5;
```

Threshold the score; do not read it as a magnitude between two levels. Jev's score levels
are weak in numeric calibration.

## State

Three layers, merged `local > scope > ambient`:

| Layer | Owner | Read in an ask as |
| --- | --- | --- |
| ambient | the library | `recent`, `dwell`, `query`, `familiarity`, `progress`, `view` |
| scope | you, at the provider | `app.*` |
| local | you, at the call site | `data.*` |

An ask only receives the channels it names by backticked path, plus its own `data`. Ambient
values are words, not numbers: `bucketDwell`, `bucketFamiliarity`, `bucketProgress`, and
`capRecent` project telemetry into bands, because Jev underperforms on numeric
representations and does not count reliably.

Judgments re-resolve when their question, their data, or an ambient channel they actually
name changes — not on every tracked click.

## `<JevInspector>`

Exported, not demo-only. Shows the exact state sent, the questions, every answer with its
probability distribution, the transport, the request count, and any failed judgment. The
state editor lets you change ambient channels by hand and re-resolve.

## Transports

`JEV_TRANSPORT` selects one; the default is `live` with a key present, `replay` without.

- `live` — one API call per batch
- `record` — live, then writes one fixture per decision
- `replay` — fixtures only, and **throws** on a miss rather than going live
- `mock` — deterministic answers, no key, no network

## Batching

Every decision registered in one tick resolves in a single request. Siblings batch; a
decision that mounts only after another's answer arrives starts its own request.

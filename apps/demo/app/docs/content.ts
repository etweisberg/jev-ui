/**
 * The single source of the documentation.
 *
 * Both the rendered pages and /llms.txt are built from this module, so the text a person
 * reads and the text a model is handed cannot drift apart. Blocks are structured rather
 * than markdown strings because the renderer needs to style them, and markdown is a
 * lossless serialization of them rather than the other way round.
 */

export type Block =
  | { t: 'p'; text: string }
  | { t: 'h'; text: string }
  | { t: 'code'; lang: string; text: string }
  | { t: 'list'; items: string[] }
  | { t: 'table'; head: string[]; rows: string[][] }
  | { t: 'note'; text: string };

export interface DocPage {
  slug: string;
  title: string;
  summary: string;
  /** A live demo that shows this page's subject working. */
  demo?: { href: string; label: string };
  blocks: Block[];
}

export const INSTALL: { id: string; label: string; add: string; run: string }[] = [
  { id: 'bun', label: 'bun', add: 'bun add jev-ui', run: 'bun run dev' },
  { id: 'npm', label: 'npm', add: 'npm install jev-ui', run: 'npm run dev' },
  { id: 'pnpm', label: 'pnpm', add: 'pnpm add jev-ui', run: 'pnpm dev' },
  { id: 'yarn', label: 'yarn', add: 'yarn add jev-ui', run: 'yarn dev' },
];

export const DOCS: DocPage[] = [
  {
    slug: 'getting-started',
    title: 'Getting started',
    summary: 'Install, wire a Server Action, and render your first judgment.',
    blocks: [
      {
        t: 'p',
        text: 'jev-ui resolves three kinds of interface question from calibrated judgments: which component to render, how to order a list, and whether to show an affordance. A fourth, `useScore`, answers how much — you describe a scale in words and get back a number to use as an ordinary prop. The model returns typed answers with probabilities; your code decides what to do with them.',
      },
      { t: 'h', text: 'Install' },
      { t: 'code', lang: 'bash', text: 'bun add jev-ui\n# npm install jev-ui · pnpm add jev-ui · yarn add jev-ui' },
      { t: 'h', text: 'Add your key' },
      {
        t: 'p',
        text: 'The key never reaches the browser. Put it in the environment file at the root of your app — Next.js loads it with no extra tooling, and so does bun.',
      },
      { t: 'code', lang: 'bash', text: '# .env\nTYPESAFE_API_KEY=apikey-...' },
      {
        t: 'note',
        text: 'Add that file to your .gitignore before you paste anything into it. With no key the library falls back to the replay transport, so a checkout without one still runs against recorded fixtures rather than crashing.',
      },
      { t: 'h', text: 'Wrap your app in the provider' },
      {
        t: 'p',
        text: '`jev-ui/action` is a ready-made Server Action. The key is read there, on the server — the browser never sees it, and because the client passes only decisions and data, it cannot be turned into a general proxy to your key.',
      },
      {
        t: 'code',
        lang: 'tsx',
        text: `// app/providers.tsx
'use client';
import { JevProvider } from 'jev-ui';
import { askJev } from 'jev-ui/action';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <JevProvider resolve={askJev} state={{ app: { role: 'analyst' } }}>
      {children}
    </JevProvider>
  );
}`,
      },
      { t: 'h', text: 'Configuration' },
      {
        t: 'p',
        text: 'Everything is environment-driven, so the common case needs no code of your own.',
      },
      {
        t: 'table',
        head: ['variable', 'default', 'what it does'],
        rows: [
          ['`TYPESAFE_API_KEY`', '—', 'Your key. Server-side only.'],
          ['`JEV_TRANSPORT`', '`live` with a key, else `replay`', '`live`, `record`, `replay`, `mock`'],
          ['`JEV_MODEL`', '`jev-latest`', 'Model id to send'],
          ['`JEV_FIXTURES_DIR`', '`fixtures`', 'Where `record` writes and `replay` reads'],
        ],
      },
      {
        t: 'p',
        text: 'Write the action yourself when you need something the environment cannot express — a custom transport, per-request model selection, or your own pricing table:',
      },
      {
        t: 'code',
        lang: 'ts',
        text: `// app/actions.ts
'use server';
import { createResolver } from 'jev-ui/server';

const resolve = createResolver({ model: 'jev-1.13.0', pricing: myRates });

export async function askJev(decisions, state) {
  return resolve(decisions, state);
}`,
      },
      { t: 'h', text: 'Render a judgment' },
      {
        t: 'code',
        lang: 'tsx',
        text: `'use client';
import { Branch, Option } from 'jev-ui';

export function Answer({ question }: { question: string }) {
  return (
    <Branch
      ask="Which view best answers the question in \`data.question\`?"
      data={{ question }}
      minConfidence={0.5}
    >
      <Option k="chart" when="The question is about a trend across many time periods.">
        <RevenueChart />
      </Option>
      <Option k="table" when="The question needs exact per-row numbers.">
        <RevenueTable />
      </Option>
      <Option fallback>
        <RevenueTable />
      </Option>
    </Branch>
  );
}`,
      },
      {
        t: 'note',
        text: 'The `when` text is the single highest-leverage string in the component. It becomes the model\'s criteria, and a bare key like "chart" gives it nothing to reason about.',
      },
      { t: 'h', text: 'The rules worth knowing up front' },
      {
        t: 'list',
        items: [
          'The judgment picks presentation; code owns actions. Nothing here should submit a form, spend money, or delete a row.',
          'The library collects two things on its own — `recent_actions` and `time_spent`. Everything else goes in `app`, with whatever keys you like, and a question reads it by naming the path: `app.tier`.',
          'Every judgment registered in one render pass becomes one request, because the state is ingested once for all of them.',
          'Typed output guarantees the interface, not the truth. Always give a Branch a fallback and a confidence floor.',
        ],
      },
    ],
  },

  {
    slug: 'branch',
    title: 'Branch',
    summary: 'Pick one subtree out of several, with a no-match outcome and a confidence floor.',
    demo: { href: '/chart', label: 'which chart answers the question' },
    blocks: [
      { t: 'p', text: 'Branch asks a Choice question and renders the matching child. It is the right primitive when the options are unordered and exactly one should win.' },
      {
        t: 'code',
        lang: 'tsx',
        text: `<Branch
  ask="Which view best answers the question in \`data.question\`?"
  data={{ question }}
  minConfidence={0.5}
  onResolved={(cost) => console.log(cost.shareUsd)}
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
</Branch>`,
      },
      { t: 'h', text: 'Props' },
      {
        t: 'table',
        head: ['prop', 'type', 'what it does'],
        rows: [
          ['ask', 'string', 'The question. Backticked paths scope which state it receives.'],
          ['data', 'Json', 'Local state for this judgment, read as `data.*`.'],
          ['minConfidence', 'number', 'Below this, the fallback renders instead of the winner.'],
          ['pending', 'ReactNode', 'Rendered while resolving. Defaults to the fallback.'],
          ['onVerdict', '(v) => void', 'The selected key, confidence, distribution, and why.'],
          ['pick', 'Channel[]', 'Narrow which state channels it receives. Default: all of them.'],
          ['onResolved', '(cost) => void', 'What the request that answered this Branch cost.'],
          ['id', 'string', 'A readable id for the Inspector. Does not affect fixtures.'],
        ],
      },
      { t: 'h', text: 'How it becomes a question' },
      {
        t: 'table',
        head: ['your code', 'the question object'],
        rows: [
          ['ask="…"', 'instructions'],
          ['<Option k="line" when="…">', 'criteria.line'],
          ['(automatic)', 'criteria.__none__'],
          ['data={{ … }}', 'state.data.<id>'],
          ['minConfidence, fallback', 'never sent — applied to the answer in code'],
        ],
      },
      { t: 'h', text: 'When the fallback renders' },
      {
        t: 'list',
        items: [
          'Confidence is below minConfidence — the model reports it is not sure, so do not act on a guess.',
          'The model picked the no-match option, meaning none of your options fit the state.',
          'The judgment failed outright. The failure is recorded and visible in the Inspector rather than swallowed.',
        ],
      },
      {
        t: 'note',
        text: 'Low confidence on a Choice often means no option is a clear winner, not that the model is broken. Several acceptable alternatives spread probability too — a harmless preference does not need a high floor.',
      },
    ],
  },

  {
    slug: 'rank',
    title: 'Rank',
    summary: 'Order, filter, and truncate a candidate set. Two modes that answer different questions.',
    demo: { href: '/feed', label: 'order a page of a feed' },
    blocks: [
      { t: 'p', text: 'Rank takes candidates your code already has and puts them in order. Typeahead is not a separate primitive — it is Rank with take.' },
      { t: 'h', text: 'compete — one Choice over the candidates' },
      {
        t: 'p',
        text: 'Probabilities sum to one, so something always wins even when nothing fits. Right for "which one did they mean": a command palette, a typeahead, a next-action menu.',
      },
      {
        t: 'code',
        lang: 'tsx',
        text: `<Rank
  items={candidates}
  idOf={(c) => c.id}
  labelOf={(c) => c.label}
  mode="compete"
  take={4}
  pinTop={2}
  ask="Which of these commands did the user mean by what they typed in \`query\`?"
>
  {(ranked) => ranked.map(({ item, score, pinned }) => <Row key={item.id} … />)}
</Rank>`,
      },
      { t: 'h', text: 'grade — one Score per candidate' },
      {
        t: 'p',
        text: 'Each item gets its own Score question, fanned out into the same request. Those scores are comparable across items and across requests, which compete mode cannot be: a per-page Choice re-normalizes, so page two cannot be ranked against page one.',
      },
      {
        t: 'code',
        lang: 'tsx',
        text: `<Rank
  items={cards}
  idOf={(c) => c.id}
  labelOf={(c) => c.title}
  mode="grade"
  levels={['Unrelated', 'Same area', 'Clearly useful', 'Exactly what they need']}
  minScore={0.5}
  ask="How well does the card in \`data.item\` match what the person has been doing, per \`recent\`?"
>
  {(ranked) => …}
</Rank>`,
      },
      { t: 'h', text: 'Choosing a mode' },
      {
        t: 'table',
        head: ['you need', 'mode'],
        rows: [
          ['One intended item out of a shortlist', 'compete'],
          ['To drop items that do not fit at all', 'grade — compete always has a winner'],
          ['To rank a second page against the first', 'grade — compete re-normalizes per request'],
          ['A score you can threshold or reuse as a feature', 'grade'],
        ],
      },
      { t: 'h', text: 'Shaping the result in code' },
      {
        t: 'list',
        items: [
          'pinTop holds the leading items in place. Reordering a menu fights muscle memory.',
          'take truncates after ranking.',
          'minScore drops weak matches, in grade mode only.',
          'Changing any of these re-derives from the answer already in hand and spends no new request — the evidence and the question have not changed.',
        ],
      },
    ],
  },

  {
    slug: 'gate',
    title: 'Gate',
    summary: 'Show an affordance when a condition holds. A Noul, read as a probability.',
    demo: { href: '/form', label: 'reveal only the fields that apply' },
    blocks: [
      {
        t: 'code',
        lang: 'tsx',
        text: `<Gate
  ask="Does the shipment in \`data.order\` cross an international border?"
  data={{ order }}
  threshold={0.6}
>
  <CustomsFields />
</Gate>`,
      },
      {
        t: 'table',
        head: ['prop', 'type', 'what it does'],
        rows: [
          ['ask', 'string', 'A yes/no condition about the state.'],
          ['threshold', 'number', 'Probability at or above which the gate opens. Default 0.5.'],
          ['otherwise', 'ReactNode', 'Rendered when the gate stays closed.'],
          ['onProbability', '(p) => void', 'The raw probability, for your own logic.'],
        ],
      },
      {
        t: 'note',
        text: 'A Noul near 0.5 means yes and no are equally likely — it does not mean "medium intensity". If you want intensity, you want a Score with defined levels.',
      },
      { t: 'h', text: 'Gates add; they do not hide' },
      {
        t: 'p',
        text: 'Use a Gate to reveal an optional field, a hint for someone who looks stuck, or an advanced panel. Do not use one to hide primary content: content removed by a judgment is an accessibility and SEO problem, and it is invisible to exactly the person who needed it.',
      },
      { t: 'h', text: 'The gate stays closed while resolving' },
      {
        t: 'p',
        text: 'An affordance that flashes in and then out is worse than one that arrives late, so nothing renders until the answer is in.',
      },
    ],
  },

  {
    slug: 'state',
    title: 'State',
    summary: 'Three layers, who owns each, and why a question only sees part of it.',
    demo: { href: '/dropdown', label: 'order a menu by what comes next' },
    blocks: [
      {
        t: 'table',
        head: ['layer', 'who sets it', 'read in an ask as'],
        rows: [
          ['ambient', 'the library, from tracked activity', '`recent_actions` and `time_spent`'],
          ['scope', 'you, at the provider', '`app.*` — any keys you like'],
          ['local', 'you, at the call site', '`data.*`'],
        ],
      },
      {
        t: 'p',
        text: 'They merge local over scope over ambient, and each layer is namespaced so they cannot collide. The library only collects the two things it can collect on its own — what the person did, and how long they have been here. Everything else is yours.',
      },
      { t: 'h', text: 'Adding your own fields' },
      {
        t: 'p',
        text: 'Anything you put in scope lands under app, and you can add whatever keys you like. Nothing about the library constrains their names.',
      },
      {
        t: 'code',
        lang: 'tsx',
        text: `<JevProvider
  resolve={askJev}
  state={{
    app: { role: 'analyst', tier: 'enterprise', familiarity: 'returning' },
    recent_actions: [],
    time_spent: 'short',
  }}
>`,
      },
      {
        t: 'p',
        text: 'Then name it from a question. State that nothing references is still sent, but the model has no idea what it is for until an ask points at it:',
      },
      {
        t: 'code',
        lang: 'tsx',
        text: '<Gate ask="Given `app.tier` and `recent_actions`, is this person likely to need the advanced panel?" />',
      },
      {
        t: 'note',
        text: 'Every channel travels with every question by default. Narrow it with `pick={[...]}` when a state grows big enough that irrelevant detail starts costing accuracy.',
      },
      { t: 'h', text: 'Updating it' },
      {
        t: 'p',
        text: 'The state lives in the provider, so there is no store to wire up. `useJevState` reads it and gives you the three ways to change it.',
      },
      {
        t: 'code',
        lang: 'tsx',
        text: `const { state, track, setAppField, setState } = useJevState();

track('exported CSV');                 // appends to recent_actions, capped
setAppField('tier', 'enterprise');     // one of your own fields
setState({ time_spent: 'long' });      // anything, merged in`,
      },
      {
        t: 'p',
        text: 'Every judgment that receives the changed state re-resolves. That is affordable because what goes in is banded words, not raw telemetry.',
      },
      { t: 'h', text: 'Observing every change' },
      {
        t: 'p',
        text: '`onStateChange` fires after every change with the new state — not on the initial render. It is the general hook: persist it, sync it to a store you already have, log it. The library never decides what it means.',
      },
      {
        t: 'code',
        lang: 'tsx',
        text: `<JevProvider
  resolve={askJev}
  state={{ app: { user } }}
  onStateChange={(next) => {
    sessionStorage.setItem(key, JSON.stringify({
      recent_actions: next.recent_actions,
      time_spent: next.time_spent,
    }));
  }}
>`,
      },
      {
        t: 'note',
        text: 'One handler, not a list — compose inside the arrow the way you would with any other React change handler. There is no built-in persistence yet: restoring on mount is yours to do, and doing it in an effect costs one extra judgment on first load because the first render sees the empty state.',
      },
      { t: 'h', text: 'Reacting to your own store' },
      {
        t: 'p',
        text: 'The `state` prop is live, not just an initial value. Pass it from Redux, a session, or a server prop and the provider syncs each key whose value changes — compared structurally, so an inline object literal does not re-sync on every render, and a key you never change never disturbs what the library collected.',
      },
      {
        t: 'code',
        lang: 'tsx',
        text: `const user = useSelector(selectUser);

<JevProvider resolve={askJev} state={{ app: { user } }}>`,
      },
      { t: 'h', text: 'Keeping time_spent current' },
      {
        t: 'p',
        text: '`useTimeOnScreen()` maintains it while someone stays on a screen. It sets timers for the band boundaries rather than polling, so it wakes at most four times and then stops — anything finer would re-resolve every judgment on a ticking interval for no gain in what the model can tell.',
      },
      {
        t: 'code',
        lang: 'tsx',
        text: `function ReportScreen() {
  useTimeOnScreen();   // time_spent: very short -> short -> medium -> long -> very long
  return <Branch ask="Given \`time_spent\`, does this person want the detailed view?" … />;
}`,
      },
      { t: 'h', text: 'Narrowing with pick' },
      {
        t: 'p',
        text: 'Accuracy degrades on a large state full of irrelevant detail, so a question can take less: `pick={["recent_actions"]}` sends only that channel plus its own data. The Inspector marks which fields went with the last request.',
      },
      { t: 'h', text: 'Telemetry becomes words' },
      {
        t: 'p',
        text: 'Jev underperforms on numeric representations and does not count reliably, so raw telemetry is the wrong input. The library projects each signal onto a named band before it is ever sent.',
      },
      {
        t: 'table',
        head: ['collected', 'sent'],
        rows: [
          ['41200 ms on the screen', 'time_spent: "long"'],
          ['a click stream', 'recent_actions: ["filtered to EMEA", "exported CSV"] — the last 12 labels'],
          ['7 visits, in your own field', 'app.familiarity: "returns often" — via bucketFamiliarity'],
        ],
      },
      {
        t: 'p',
        text: 'Banding has a second benefit: it keeps re-resolution rare. Milliseconds churn on every tick, while "short" becomes "medium" a handful of times.',
      },
      { t: 'h', text: 'When a judgment re-resolves' },
      {
        t: 'list',
        items: [
          'Its question changed.',
          'Its data changed.',
          'Any state it receives changed — which is affordable because that state is banded words, not raw telemetry.',
          'You called revalidate() from the provider.',
        ],
      },
    ],
  },

  {
    slug: 'cost',
    title: 'Cost',
    summary: 'What a rendering decision costs, where the number comes from, and why batching is the whole argument.',
    blocks: [
      {
        t: 'p',
        text: 'Every component reports what its judgment cost. Jev bills per input token and output tokens are free, so the interesting figure is usually per thousand renders rather than per render.',
      },
      {
        t: 'code',
        lang: 'tsx',
        text: `import { JevCost } from 'jev-ui';

const [cost, setCost] = useState<DecisionCost>();

<Branch ask="…" onResolved={setCost}>…</Branch>
<JevCost cost={cost} />        // this decision's share
<JevCost cost={cost} batch />  // the whole request`,
      },
      { t: 'h', text: 'What the numbers mean' },
      {
        t: 'table',
        head: ['field', 'meaning'],
        rows: [
          ['batchUsd', 'USD for the whole request this judgment travelled in.'],
          ['shareUsd', 'batchUsd divided by the number of questions in that request.'],
          ['decisions', 'How many questions shared the request.'],
          ['requests', 'Upstream calls made. One for a whole render pass; zero on replay.'],
          ['inputTokens', 'Tokens billed for the request.'],
          ['estimated', 'True when the figure came from a recording rather than this call.'],
        ],
      },
      {
        t: 'note',
        text: 'The share is an attribution, not a measurement. The API bills per request, so per-question cost cannot be observed — only divided. That division is the point: the marginal question is close to free.',
      },
      { t: 'h', text: 'Why batching dominates the bill' },
      {
        t: 'p',
        text: 'A request ingests the state once and evaluates every question against it in parallel. Four judgments on one page are one request and one state ingestion, not four. Splitting them into separate calls multiplies the state, not just the questions.',
      },
      { t: 'h', text: 'Overriding the rates' },
      {
        t: 'code',
        lang: 'tsx',
        text: `createResolver({
  pricing: { 'jev-1.13.0': { inputPerMtokUsd: 0.042 } },
});`,
      },
      {
        t: 'p',
        text: 'Published prices change and the built-in table will go stale. Treat the reported cost as an estimate you control, not as a bill.',
      },
    ],
  },

  {
    slug: 'transports-and-testing',
    title: 'Transports and testing',
    summary: 'Run live, record fixtures, replay them offline, and prove the UI follows the judgment.',
    blocks: [
      {
        t: 'p',
        text: 'JEV_TRANSPORT decides how judgments are answered. The default is live when a key is present and replay when one is not, so a checkout with no key still runs.',
      },
      {
        t: 'table',
        head: ['value', 'behaviour'],
        rows: [
          ['live', 'One API call per batch.'],
          ['record', 'Live, then writes one fixture per decision.'],
          ['replay', 'Fixtures only. Throws on a miss rather than going live.'],
          ['mock', 'Deterministic synthetic answers. No key, no network.'],
        ],
      },
      { t: 'h', text: 'Fixtures' },
      {
        t: 'p',
        text: 'A fixture is keyed on the question, the state that question saw, and the model — deliberately not on the decision id, which is per-instance and changes between reloads. Adding a judgment elsewhere on the page therefore does not invalidate the ones already recorded.',
      },
      {
        t: 'note',
        text: 'Replay throws on a miss instead of falling through to a live call. A missing fixture should be a loud failure, not an accidental charge and a nondeterministic test.',
      },
      { t: 'h', text: 'Testing without spending anything' },
      {
        t: 'list',
        items: [
          'Unit tests use the mock transport: no key, no network, fully deterministic.',
          'End-to-end tests run the app under replay, with the API key absent from that environment — the absence is what proves replay is really serving the judgments.',
          'A live contract test can be skipped when no key is present, so CI stays green either way.',
        ],
      },
      { t: 'h', text: 'The test that actually matters' },
      {
        t: 'p',
        text: 'Edit a recorded answer on disk, reload, and assert the UI changed. Without that test, a component permanently rendering its fallback is indistinguishable from a working one.',
      },
      {
        t: 'code',
        lang: 'ts',
        text: `// change the recorded choice from "line" to "stat"
record.answer = { type: 'choice', choice: 'stat', probabilities: { … }, confidence: 0.85 };
writeFileSync(fixturePath, JSON.stringify(record, null, 2));

await page.reload();
await expect(page.getByTestId('view-stat')).toBeVisible();`,
      },
    ],
  },
];

/** Stable anchor ids, so a link to a section keeps working when the prose around it moves. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface Heading {
  id: string;
  text: string;
}

export function headingsOf(page: DocPage): Heading[] {
  return page.blocks
    .filter((block): block is { t: 'h'; text: string } => block.t === 'h')
    .map((block) => ({ id: slugify(block.text), text: block.text }));
}

export function docBySlug(slug: string): DocPage | undefined {
  return DOCS.find((page) => page.slug === slug);
}

/** Markdown serialization — what /llms.txt serves and the copy button copies. */
export function blocksToMarkdown(blocks: Block[]): string {
  const out: string[] = [];
  for (const block of blocks) {
    switch (block.t) {
      case 'h':
        out.push(`## ${block.text}`);
        break;
      case 'p':
        out.push(block.text);
        break;
      case 'note':
        out.push(`> ${block.text}`);
        break;
      case 'code':
        out.push('```' + block.lang + '\n' + block.text + '\n```');
        break;
      case 'list':
        out.push(block.items.map((item) => `- ${item}`).join('\n'));
        break;
      case 'table':
        out.push(
          [
            `| ${block.head.join(' | ')} |`,
            `| ${block.head.map(() => '---').join(' | ')} |`,
            ...block.rows.map((row) => `| ${row.join(' | ')} |`),
          ].join('\n'),
        );
        break;
    }
  }
  return out.join('\n\n');
}

export function pageToMarkdown(page: DocPage): string {
  return `# ${page.title}\n\n> ${page.summary}\n\n${blocksToMarkdown(page.blocks)}`;
}

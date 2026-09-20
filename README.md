# jev-ui

React components that resolve **which** component to render, **how** to order a list, and
**whether** to show an affordance — from calibrated judgments returned by
[TypeSafe](https://docs.typesafe.ai)'s Jev.

Three components over the three model primitives:

| Component | Primitive | What it does |
| --- | --- | --- |
| `<Branch>` | Choice + no-match | picks one subtree out of several |
| `<Rank>` | Choice **or** one Score per item | orders, filters, and truncates a candidate set |
| `<Gate>` | Noul | shows an affordance when a condition holds |

Every component reports what its judgment cost through `onResolved`, and `<JevCost>`
renders it. A request is billed once however many questions travel in it, so the figure
worth watching is the request total and the per-thousand rate.

Plus `useScore` for judgments that drive props rather than subtrees, and `useDecision(s)`
for raw answers. Typeahead is not a fourth concept — it is
`<Rank mode="compete" take={4}>`.

## The rules the library is built around

- **The judgment picks presentation; code owns actions.** Nothing here submits a form,
  spends money, or deletes a row.
- **Telemetry becomes words before the model sees it.** Jev underperforms on numeric
  representations and does not count reliably, so `dwellMs: 41200` is projected to
  `dwell: "studied"` and a click stream to a capped list of labels. Bands also keep
  re-resolution rare: milliseconds churn, `"glanced" → "read"` happens at most twice.
- **An ask scopes its own state.** Questions reference state with backticked paths, so the
  library reads those paths and sends only the channels a question actually names — Jev
  degrades on large states full of irrelevant detail.
- **Every judgment in one render pass is one request.** Questions in a single request run
  in parallel and cost only their own tokens. The demo's form resolves four judgments in
  one call; its feed grades twelve cards in one call.
- **Gates only add.** Content hidden by a judgment is an accessibility and SEO problem,
  and it is invisible to whoever needed it.

## Docs site

`apps/demo` is the documentation site as well as the demo, built to deploy to Vercel
(`vercel.json` is set up for the workspace). It serves:

- a landing page with install instructions for bun, npm, pnpm and yarn
- seven reference pages under `/docs`, generated from one typed content module
- `/llms.txt` — the whole documentation set as plain markdown, from that same module, so
  what a person reads and what a model is handed cannot drift apart
- five live demos, each showing its own source, the question it generated, the state it
  sent, the answer it got back, and what it cost

## Quick start

```bash
bun install
```

Put a TypeSafe API key in the demo app's environment file — this is exactly how an app
consuming the library supplies one, and Next.js loads it with no extra tooling:

```bash
cp apps/demo/.env.example apps/demo/.env   # then fill in TYPESAFE_API_KEY
bun run --filter demo check:key               # confirms the key and the response shape
bun run dev                                   # http://localhost:3111
```

Without a key the demo still runs: it falls back to the recorded fixtures.

## Demos

Each one renders live, shows **its own source read off disk** (so the code on the page
cannot drift from the code that ran), and exposes the exact request behind it in the
Inspector.

| Route | Shows |
| --- | --- |
| `/chart` | `<Branch>` over four views; the confidence floor sending an ambiguous question to the fallback |
| `/dropdown` | `<Rank mode="compete">`; the Choice distribution *is* the order; `pinTop` protecting muscle memory |
| `/typeahead` | `<Rank take={4}>`; code finds candidates, the judgment only selects |
| `/feed` | `<Rank mode="grade">`; comparable across pages, and able to drop weak matches |
| `/form` | three `<Gate>`s and a `useScore`, all resolved in one request |

## Testing

Three tiers, and only one of them costs anything.

```bash
bun run test        # 91 unit tests, offline, mock transport
bun run typecheck   # library + demo
bun run e2e         # 54 browser tests against the demo and docs, offline via fixtures
bun run record      # the only tier that calls the API (~50 judgments, fractions of a cent)
```

**Unit** covers state merging and projection, path extraction and scoping, fixture-key
stability, confidence gating, both ranking modes, cost attribution and formatting, and
that N decisions registered in one tick become exactly one request.

**End-to-end** runs the demo under `JEV_TRANSPORT=replay`, so every page is deterministic
and `TYPESAFE_API_KEY` is *absent* from that environment — which is what proves replay is
genuinely serving the judgments rather than quietly going live. A missing fixture throws
instead of falling through to a live call.

Two of those tests matter more than the rest:

- **The rendered view follows the judgment.** A recorded answer is edited on disk, the page
  is reloaded, and the UI must change. Without this, a library that always renders its
  fallback looks identical to a working one.
- **The page shows the source that ran.** The panel elides demo scaffolding behind
  `// …`, and the test asserts that every surviving line appears verbatim in the file, in
  order — so the snippet can be shorter than the source, never different from it.

Fixtures are recorded by driving the real pages with the recording transport, using
[the same walk definitions the tests use](e2e/walks.mjs). Nothing rebuilds the questions
the components ask, so a fixture cannot disagree with the code that replays it.

## Transports

`JEV_TRANSPORT` picks how judgments are answered. Default: `live` when a key is present,
`replay` otherwise.

| Value | Behaviour |
| --- | --- |
| `live` | one API call per batch |
| `record` | live, then writes one fixture per decision |
| `replay` | fixtures only; **throws** on a miss rather than going live |
| `mock` | deterministic synthetic answers, no key, no network |

Fixtures are keyed on the question, the state that question saw, and the model — not on
the decision's id, which is per-instance and changes between reloads. So adding a decision
elsewhere on the page does not invalidate the ones already recorded.

## Layout

```
packages/jev-ui/     the library (src/core is framework-free and unit-tested)
apps/demo/           Next.js demo app; fixtures/ holds the recorded judgments
e2e/                 Playwright specs + the walk definitions shared with the recorder
```

## Where the API key can go

Only server-side. The client calls a Server Action with decisions and data; it never names
a model or a transport, so the endpoint cannot be turned into an open proxy to the key. A
generic `/api/jev` route that forwarded client-supplied state and questions would be
exactly that.

## Known rough edges

- Batching covers judgments registered in the same tick. A decision that only mounts after
  another one's answer arrives starts its own request; siblings batch, waterfalls do not.
- `reactStrictMode` is off in the demo. Strict Mode double-invokes effects in development,
  which would double every judgment and make the Inspector's request count a lie.
- The library is client-side (`JevProvider` + Server Action). Resolving inside a Server
  Component would need a request-scoped collector via `React.cache()`; that is not built
  yet, and the batching semantics there are less predictable.

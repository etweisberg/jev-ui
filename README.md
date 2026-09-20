# jev-ui

[![npm](https://img.shields.io/npm/v/jev-ui)](https://www.npmjs.com/package/jev-ui)
[![ci](https://github.com/etweisberg/jev-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/etweisberg/jev-ui/actions/workflows/ci.yml)

React components that decide **which** component to render, **how** to order a list, and
**whether** to show an affordance — from calibrated judgments returned by
[TypeSafe](https://docs.typesafe.ai)'s Jev.

The model returns a typed answer with probabilities and a confidence. Your code keeps the
thresholds, the fallbacks, and every action.

---

## Quick start

### 1. Install

```bash
bun add jev-ui        # npm install jev-ui · pnpm add jev-ui · yarn add jev-ui
```

### 2. Get an API key

Create one in the [TypeSafe console](https://console.typesafe.ai). It looks like `apikey-...`.

### 3. Put it in your environment

Create `.env` in the root of your Next.js app:

```bash
TYPESAFE_API_KEY=apikey-your-key-here
```

Add it to `.gitignore` **before** you paste the key in:

```bash
echo ".env" >> .gitignore
```

Next.js and bun both load `.env` on their own. There is nothing else to configure.

### 4. Wrap your app in the provider

`jev-ui/action` is a ready-made Server Action. The key is read there, on the server — the
browser never sees it.

```tsx
// app/providers.tsx
'use client';

import { JevProvider } from 'jev-ui';
import { askJev } from 'jev-ui/action';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <JevProvider resolve={askJev} state={{ app: { role: 'analyst' } }}>
      {children}
    </JevProvider>
  );
}
```

```tsx
// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### 5. Render your first judgment

```tsx
'use client';

import { Branch, Option } from 'jev-ui';

export function Answer({ question }: { question: string }) {
  return (
    <Branch
      ask="Which view best answers the question in `data.question`?"
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
}
```

That is the whole setup. The `when` text on each `<Option>` is the highest-leverage string
you will write: it becomes the model's criteria, and a bare key like `"chart"` gives it
nothing to reason about.

---

## Configuration

Everything is environment-driven, so the common case needs no code.

| Variable | Default | What it does |
| --- | --- | --- |
| `TYPESAFE_API_KEY` | — | Your key. Server-side only. |
| `JEV_TRANSPORT` | `live` with a key, else `replay` | `live`, `record`, `replay`, or `mock` |
| `JEV_MODEL` | `jev-latest` | Model id to send |
| `JEV_FIXTURES_DIR` | `fixtures` | Where `record` writes and `replay` reads |

Need something the environment cannot express — a custom transport, per-request model
selection, your own pricing table? Write the action yourself:

```ts
// app/actions.ts
'use server';
import { createResolver } from 'jev-ui/server';

const resolve = createResolver({ model: 'jev-1.13.0', pricing: myRates });

export async function askJev(decisions, state) {
  return resolve(decisions, state);
}
```

---

## What you get

| Component | Primitive | What it does |
| --- | --- | --- |
| `<Branch>` | Choice + no-match | picks one subtree out of several |
| `<Rank>` | Choice **or** one Score per item | orders, filters, and truncates a candidate set |
| `<Gate>` | Noul | shows an affordance when a condition holds |

Those three decide *what* renders. `useScore` answers *how much*: describe a scale in
words, get a number back, and use it as an ordinary prop — show the help text or not, load
10 rows or 50, render the dense table or the roomy one.

Typeahead is `<Rank mode="compete" take={4}>`. Code finds the candidates; the judgment only
picks among them.

### State

Three layers, merged local over scope over ambient:

| Layer | Who sets it | Read in an ask as |
| --- | --- | --- |
| ambient | the library | `recent_actions`, `time_spent` |
| scope | you, at the provider | `app.*` — any keys you like |
| local | you, at the call site | `data.*` |

```tsx
const { state, track, setAppField } = useJevState();

track('exported CSV');              // appends to recent_actions, capped
setAppField('tier', 'enterprise');  // one of your own fields
```

The `state` prop is live, not just an initial value — pass it from Redux, a session, or a
server prop and the provider syncs each key whose value changes. `onStateChange` fires
after every change if you want to persist or mirror it.

### The rules it is built around

- **The judgment picks presentation; code owns actions.** Nothing here submits a form,
  spends money, or deletes a row.
- **Every judgment in one render pass is one request.** The state is ingested once for all
  of them, so the marginal question is close to free — and each component reports what it
  cost through `onResolved`.
- **Telemetry becomes words.** `41200 ms` is projected to `time_spent: "long"` before the
  model sees it, because Jev underperforms on numeric representations and does not count
  reliably. Bands also keep re-resolution rare.
- **Gates only add.** Content hidden by a judgment is an accessibility and SEO problem, and
  it is invisible to whoever needed it.

---

## Docs and demos

Full reference and five live demos: **[the docs site](https://docs.jev-ui.dev)**.

Each demo shows its own source read off disk, the question it generated, the state it sent,
the answer it got back, and what that render cost. `/llms.txt` serves the whole
documentation set as plain markdown, generated from the same module the pages render.

Running the site yourself, with your own key, makes every demo call the real API:

```bash
git clone https://github.com/etweisberg/jev-ui
cd jev-ui && bun install
echo "TYPESAFE_API_KEY=apikey-..." > apps/demo/.env
bun run dev                       # http://localhost:3111
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the repo layout, the test tiers, how fixtures are
recorded, and how releases work.

MIT licensed.

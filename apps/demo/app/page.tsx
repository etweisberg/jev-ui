import Link from 'next/link';
import { InstallTabs } from './lib/InstallTabs';

const PRIMITIVES = [
  {
    name: '<Branch>',
    primitive: 'Choice + no-match',
    does: 'picks one subtree out of several',
    href: '/docs/branch',
    demo: '/chart',
  },
  {
    name: '<Rank>',
    primitive: 'Choice or one Score per item',
    does: 'orders, filters, and truncates a candidate set',
    href: '/docs/rank',
    demo: '/feed',
  },
  {
    name: '<Gate>',
    primitive: 'Noul',
    does: 'shows an affordance when a condition holds',
    href: '/docs/gate',
    demo: '/form',
  },
];

const CLAIMS = [
  {
    head: 'One request per render pass',
    body: 'Every judgment registered in one pass is batched into a single call. The state is ingested once for all of them, so the marginal question is close to free — and each component reports what it cost.',
  },
  {
    head: 'The question scopes its own state',
    body: 'An ask names the state it needs by backticked path, and only those channels are sent. Accuracy degrades on a large state full of irrelevant detail, so this is not a micro-optimisation.',
  },
  {
    head: 'Telemetry becomes words',
    body: 'dwellMs: 41200 is projected to dwell: "studied" before the model sees it. Jev underperforms on numeric representations and does not count reliably, and bands also keep re-resolution rare.',
  },
  {
    head: 'The judgment picks presentation',
    body: 'Code owns every action. Nothing here submits a form, spends money, or deletes a row — and gates only ever add affordances, never hide primary content.',
  },
];

export default function Home() {
  return (
    <>
      <section
        style={{ maxWidth: '68ch', margin: '24px auto 56px', textAlign: 'center' }}
        data-testid="hero"
      >
        <h1 style={{ fontSize: 17 }}>jev-ui</h1>
        <p style={{ color: 'var(--fg)', margin: '0 0 8px', fontSize: 14, lineHeight: 1.75 }}>
          React components that decide <em>which</em> component to render, <em>how</em> to order a
          list, and <em>whether</em> to show an affordance — from calibrated judgments returned by
          TypeSafe&rsquo;s Jev.
        </p>
        <p className="blurb" style={{ marginBottom: 24, marginInline: 'auto' }}>
          The model returns a typed answer with probabilities and a confidence. Your code keeps the
          thresholds, the fallbacks, and every action.
        </p>

        <InstallTabs center />

        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 20,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <Link href="/docs/getting-started" className="ctl" data-testid="cta-docs">
            read the docs
          </Link>
          <Link href="/chart" className="ctl" data-testid="cta-demo">
            see it running
          </Link>
          <Link
            href="/llms.txt"
            className="ctl accent"
            data-testid="cta-llms"
          >
            llms.txt
          </Link>
        </div>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2>three components, three primitives</h2>
        <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
          {PRIMITIVES.map((entry, index) => (
            <div
              key={entry.name}
              style={{
                display: 'grid',
                gridTemplateColumns: '150px 1fr auto',
                gap: 14,
                alignItems: 'baseline',
                padding: '14px 18px',
                background: 'var(--panel)',
                borderTop: index === 0 ? 'none' : '1px solid var(--line-soft)',
              }}
            >
              <Link href={entry.href} style={{ color: 'var(--accent)' }}>
                <code>{entry.name}</code>
              </Link>
              <span>
                {entry.does}
                <span style={{ display: 'block', fontSize: 10.5, color: 'var(--muted)' }}>
                  {entry.primitive}
                </span>
              </span>
              <Link href={entry.demo} style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                demo →
              </Link>
            </div>
          ))}
        </div>
        <p className="blurb" style={{ marginTop: 12, marginBottom: 0 }}>
          Those three decide <em>what</em> renders. <code>useScore</code> answers{' '}
          <em>how much</em>: you describe a scale in words, it returns a number, and your code uses
          it as an ordinary prop — show the help text or not, load 10 rows or 50, render the dense
          table or the roomy one. In the <Link href="/form">form demo</Link> it decides how much
          explanation each field carries, from &ldquo;labels are enough&rdquo; to &ldquo;every
          non-obvious field needs a sentence&rdquo;.
        </p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2>what it does differently</h2>
        <div className="claims">
          {CLAIMS.map((claim) => (
            <div key={claim.head} className="card">
              <strong style={{ display: 'block', marginBottom: 6, letterSpacing: '0.03em' }}>
                {claim.head}
              </strong>
              <span style={{ color: 'var(--muted)' }}>{claim.body}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>live here, offline in CI</h2>
        <p className="blurb">
          Every demo on this site calls the real API as you click it — the panel under each one
          shows the transport, the token count and what that render cost. Recording is for the test
          suite: capture each judgment once, then replay it with no key and no network so the tests
          are deterministic and free. Replay throws on a missing fixture rather than quietly going
          live. <Link href="/docs/transports-and-testing">Transports and testing →</Link>
        </p>
      </section>
    </>
  );
}

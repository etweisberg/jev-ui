import Link from 'next/link';
import { DOCS } from './content';

export const metadata = { title: 'Docs — jev-ui' };

export default function DocsIndex() {
  return (
    <>
      <h1>docs</h1>
      <p className="blurb">
        Everything the library does, in seven pages. The whole set is also served as plain markdown
        at <Link href="/llms.txt" className="docs-link" data-testid="docs-llms-link">
          /llms.txt
        </Link> for pasting
        into a model.
      </p>
      <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
        {DOCS.map((page, index) => (
          <Link
            key={page.slug}
            href={`/docs/${page.slug}`}
            data-testid={`doc-${page.slug}`}
            style={{
              display: 'block',
              padding: '14px 18px',
              background: 'var(--panel)',
              borderTop: index === 0 ? 'none' : '1px solid var(--line-soft)',
            }}
          >
            <span style={{ letterSpacing: '0.04em' }}>{page.title}</span>
            <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
              {page.summary}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}

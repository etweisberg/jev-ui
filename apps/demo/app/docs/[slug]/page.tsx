import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Blocks } from '../Blocks';
import { CopyMarkdown } from '../CopyMarkdown';
import { DOCS, docBySlug, headingsOf, pageToMarkdown } from '../content';
import { Toc } from '../Toc';

export function generateStaticParams() {
  return DOCS.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = docBySlug(slug);
  return page ? { title: `${page.title} — jev-ui`, description: page.summary } : {};
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = docBySlug(slug);
  if (!page) notFound();

  const index = DOCS.findIndex((entry) => entry.slug === slug);
  const previous = DOCS[index - 1];
  const next = DOCS[index + 1];

  const headings = headingsOf(page);

  return (
    <div className="doc-layout">
      <article>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h1 style={{ margin: 0 }}>{page.title}</h1>
        <CopyMarkdown markdown={pageToMarkdown(page)} />
      </div>
      <p className="blurb" style={{ marginTop: 8 }}>
        {page.summary}
      </p>

      {page.demo ? (
        <Link
          href={page.demo.href}
          className="card"
          data-testid="doc-demo-link"
          style={{ display: 'block', marginBottom: 24, padding: '12px 16px' }}
        >
          <span style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--muted)' }}>LIVE DEMO →</span>
          <span style={{ display: 'block' }}>{page.demo.label}</span>
        </Link>
      ) : null}

      <Blocks blocks={page.blocks} />

      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          marginTop: 40,
          paddingTop: 18,
          borderTop: '1px solid var(--line)',
        }}
      >
        <span>
          {previous ? (
            <Link href={`/docs/${previous.slug}`} style={{ color: 'var(--muted)' }}>
              ← {previous.title}
            </Link>
          ) : null}
        </span>
        <span>
          {next ? (
            <Link href={`/docs/${next.slug}`} style={{ color: 'var(--muted)' }}>
              {next.title} →
            </Link>
          ) : null}
        </span>
      </nav>
      </article>
      <aside className="doc-toc">
        <Toc headings={headings} />
      </aside>
    </div>
  );
}

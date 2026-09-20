'use client';

import { useEffect, useState } from 'react';
import type { Heading } from './content';

/**
 * Section list for the current page, with the section you are reading marked.
 *
 * Uses IntersectionObserver rather than scroll maths: it reports which headings are on
 * screen without running work on every scroll frame.
 */
export function Toc({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState(headings[0]?.id ?? '');

  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const onScreen = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (onScreen[0]?.target.id) setActive(onScreen[0].target.id);
      },
      { rootMargin: '-80px 0px -60% 0px' },
    );
    for (const heading of headings) {
      const element = document.getElementById(heading.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav aria-label="On this page" data-testid="toc" style={{ position: 'sticky', top: 16 }}>
      <div
        style={{
          fontSize: 9.5,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginBottom: 8,
        }}
      >
        on this page
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 2 }}>
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              data-testid={`toc-${heading.id}`}
              aria-current={active === heading.id ? 'true' : undefined}
              style={{
                display: 'block',
                padding: '3px 0 3px 10px',
                fontSize: 11,
                lineHeight: 1.5,
                borderLeft: `2px solid ${active === heading.id ? 'var(--accent)' : 'var(--line)'}`,
                color: active === heading.id ? 'var(--accent)' : 'var(--muted)',
              }}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

'use client';

import { useEffect, useState } from 'react';
import type { Heading } from './content';

/** How far below the sticky tab bar a heading counts as "the one you are reading". */
const TOP_OFFSET = 100;

/**
 * Section list for the current page, with the section you are reading marked.
 *
 * Computed from the headings' positions rather than with IntersectionObserver. An
 * observer needs a heading to enter a band near the top of the viewport, which the last
 * heading on a page can never do — the page runs out of scroll first, so the final entry
 * would never highlight. Reading positions directly has no such blind spot, and the work
 * is throttled to one frame.
 */
export function Toc({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState(headings[0]?.id ?? '');

  useEffect(() => {
    if (headings.length === 0) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      const scrolled = window.scrollY + window.innerHeight;
      const atBottom = scrolled >= document.documentElement.scrollHeight - 2;
      if (atBottom) {
        // Whatever the maths says, the last section is what you are looking at.
        setActive(headings[headings.length - 1]!.id);
        return;
      }

      let current = headings[0]!.id;
      for (const heading of headings) {
        const element = document.getElementById(heading.id);
        if (element && element.getBoundingClientRect().top <= TOP_OFFSET) current = heading.id;
      }
      setActive(current);
    };

    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
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

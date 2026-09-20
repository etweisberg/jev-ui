'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const DEMOS = [
  { href: '/chart', label: 'chart', what: 'Branch — pick a view' },
  { href: '/dropdown', label: 'dropdown', what: 'Rank — order a menu' },
  { href: '/typeahead', label: 'typeahead', what: 'Rank — pick a completion' },
  { href: '/feed', label: 'feed', what: 'Rank — grade a page' },
  { href: '/form', label: 'form', what: 'Gate + useScore' },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const onDemo = DEMOS.some((demo) => demo.href === pathname);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <nav className="tabs">
      <Link href="/" className={`tab brand${pathname === '/' ? ' on' : ''}`}>
        jev-ui
      </Link>
      <Link
        href="/docs"
        className={`tab${pathname.startsWith('/docs') ? ' on' : ''}`}
        data-testid="nav-docs"
      >
        docs
      </Link>

      <div ref={wrap} style={{ position: 'relative' }}>
        <button
          type="button"
          className={`tab${onDemo ? ' on' : ''}`}
          data-testid="nav-demos"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((value) => !value)}
          style={{ cursor: 'pointer', font: 'inherit' }}
        >
          demos {open ? '▴' : '▾'}
        </button>
        {open ? (
          <div
            role="menu"
            data-testid="nav-demos-menu"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              zIndex: 20,
              minWidth: 240,
              background: 'var(--panel)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: 4,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            }}
          >
            {DEMOS.map((demo) => (
              <Link
                key={demo.href}
                href={demo.href}
                role="menuitem"
                data-testid={`nav-${demo.label}`}
                style={{
                  display: 'block',
                  padding: '7px 10px',
                  borderRadius: 6,
                  background: pathname === demo.href ? 'var(--raise)' : 'transparent',
                }}
              >
                <span style={{ fontSize: 11, letterSpacing: '0.06em' }}>{demo.label}</span>
                <span style={{ display: 'block', fontSize: 10, color: 'var(--muted)' }}>
                  {demo.what}
                </span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <a
        href="https://github.com/etweisberg/jev-ui"
        target="_blank"
        rel="noreferrer"
        className="tab"
        data-testid="nav-github"
        style={{ marginLeft: 'auto' }}
      >
        github ↗
      </a>
    </nav>
  );
}

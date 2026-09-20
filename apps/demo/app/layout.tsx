import type { Metadata } from 'next';
import { IBM_Plex_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { JevRoot } from './lib/JevRoot';
import { Nav } from './lib/Nav';

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'jev-ui demos',
  description:
    'Component resolution, list ordering, and conditional affordances from calibrated judgments.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={mono.className}>
      <body>
        <style>{`
          :root {
            --bg: #e8e6e0;
            --panel: #f8f7f3;
            --raise: #fdfcfa;
            --fg: #1a1916;
            --muted: #8b877c;
            --line: #d6d2c7;
            --line-soft: #e3dfd5;
            --accent: #b64e26;
            --ink: #1a1916;
            --on-ink: #f6f4ef;
            color-scheme: light dark;
          }
          @media (prefers-color-scheme: dark) {
            :root:not([data-theme="light"]) {
              --bg: #161512;
              --panel: #1d1c18;
              --raise: #232219;
              --fg: #ece9e0;
              --muted: #8d887b;
              --line: #33302a;
              --line-soft: #2a2823;
              --accent: #dd7a4e;
              --ink: #ece9e0;
              --on-ink: #161512;
            }
          }

          * { box-sizing: border-box; }

          body {
            margin: 0;
            background: var(--bg);
            color: var(--fg);
            font-size: 13px;
            line-height: 1.7;
            -webkit-font-smoothing: antialiased;
          }

          a { color: inherit; text-decoration: none; }

          /* ---- tab bar ---- */
          .tabs {
            display: flex;
            gap: 2px;
            flex-wrap: wrap;
            align-items: stretch;
            padding: 8px 14px;
            background: var(--panel);
            border-bottom: 1px solid var(--line);
          }
          .tab {
            padding: 7px 14px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 500;
            letter-spacing: 0.13em;
            text-transform: uppercase;
            color: var(--muted);
            white-space: nowrap;
          }
          .tab:hover { color: var(--fg); background: var(--line-soft); }
          .tab.on { background: var(--ink); color: var(--on-ink); }
          .tab.brand { font-weight: 600; letter-spacing: 0.18em; color: var(--fg); }
          .tab.brand.on { color: var(--on-ink); }

          /* ---- page frame ---- */
          .wrap { max-width: 1000px; margin: 0 auto; padding: 28px 16px 80px; }

          h1 {
            font-size: 15px;
            font-weight: 600;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            margin: 6px 0 10px;
          }
          h2 {
            font-size: 10px;
            font-weight: 500;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: var(--muted);
            margin: 0 0 10px;
          }
          p.blurb { color: var(--muted); margin: 0 0 24px; }
          p.blurb code { color: var(--fg); }
          code { font-size: 0.95em; }

          /* ---- panels ---- */
          .card {
            min-width: 0;
            overflow-wrap: anywhere;
            background: var(--panel);
            border: 1px solid var(--line);
            border-radius: 8px;
            padding: 18px;
          }

          /* ---- controls: outlined chips ---- */
          .ctl {
            font: inherit;
            font-size: 11px;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            padding: 6px 12px;
            cursor: pointer;
            border-radius: 6px;
            border: 1px solid var(--line);
            background: var(--raise);
            color: var(--muted);
          }
          .ctl:hover:not(:disabled) { color: var(--fg); border-color: var(--muted); }
          .ctl[aria-pressed="true"] {
            border-color: var(--accent);
            color: var(--accent);
            background: transparent;
          }
          .ctl:disabled { opacity: 0.4; cursor: not-allowed; }
          input.ctl, select.ctl, textarea.ctl {
            text-transform: none; letter-spacing: 0; color: var(--fg);
            border-color: var(--line-soft); background: var(--raise);
          }
          input.ctl:focus, select.ctl:focus, textarea.ctl:focus {
            outline: none; border-color: var(--accent);
          }

          pre.src {
            margin: 0;
            padding: 16px;
            overflow-x: auto;
            border-radius: 8px;
            background: var(--panel);
            border: 1px solid var(--line-soft);
            font-size: 11.5px;
            line-height: 1.65;
            color: var(--fg);
          }

          .claims { display: grid; gap: 12px; grid-template-columns: 1fr; }
          @media (min-width: 760px) { .claims { grid-template-columns: 1fr 1fr; } }
          a.ctl { display: inline-block; text-decoration: none; }
          .ctl.accent { color: var(--accent); border-color: var(--accent); }
          .ctl.accent:hover { color: var(--accent); border-color: var(--accent);
            background: var(--raise); }
          /* Inline links inside prose read as links, not as body text. */
          p.blurb a, article a:not(.ctl):not(.card), .docs-link { color: var(--accent); }

          .doc-layout { display: grid; gap: 32px; grid-template-columns: minmax(0, 1fr); }
          .doc-toc { display: none; }
          @media (min-width: 900px) {
            .doc-layout { grid-template-columns: minmax(0, 1fr) 200px; }
            .doc-toc { display: block; }
          }

          .cols { display: grid; gap: 22px; grid-template-columns: 1fr; }
          /* Grid children default to min-width:auto, so the Inspector's long JSON
             pushes its track wider than the page instead of scrolling inside it. */
          .cols > * { min-width: 0; }
          @media (min-width: 980px) { .cols { grid-template-columns: minmax(0, 1.12fr) minmax(0, 0.88fr); } }

          /* the jev-ui Inspector reads these, so it inherits the host theme */
          [data-jev-inspector] {
            --jev-bg: var(--panel);
            --jev-fg: var(--fg);
            --jev-muted: var(--muted);
            --jev-line: var(--line);
            --jev-raise: var(--raise);
            --jev-accent: var(--accent);
            --jev-radius: 8px;
          }
        `}</style>
        <Nav />
        <JevRoot>
          <div className="wrap">{children}</div>
        </JevRoot>
      </body>
    </html>
  );
}

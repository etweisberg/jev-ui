import { DOCS, pageToMarkdown } from '../docs/content';

/**
 * The whole documentation set as one markdown file, generated from the same module the
 * pages render. A model handed this cannot be reading something the site does not say.
 */
export const dynamic = 'force-static';

export function GET() {
  const body = [
    '# jev-ui',
    '',
    '> React components that resolve which component to render, how to order a list, and',
    '> whether to show an affordance — from calibrated judgments returned by TypeSafe’s Jev.',
    '',
    '- `<Branch>` — Choice with a no-match outcome; picks one subtree.',
    '- `<Rank>` — Choice or one Score per item; orders, filters, truncates a candidate set.',
    '- `<Gate>` — Noul; shows an affordance when a condition holds.',
    '- `useScore` — a graded dimension that drives props rather than a subtree.',
    '',
    '---',
    '',
    DOCS.map(pageToMarkdown).join('\n\n---\n\n'),
  ].join('\n');

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate',
    },
  });
}

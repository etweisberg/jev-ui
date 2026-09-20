import { CHANNELS, type Channel } from './types.js';

/**
 * TypeSafe questions point at state with backticked paths (`ticket.messages[0].text`).
 * We read those paths to decide which state channels a question actually needs,
 * which keeps each judgment's state small — Jev degrades on large states full of
 * irrelevant detail.
 */
const PATH_RE = /`([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+|\[\d+\])*)`/g;

export function extractPaths(ask: string): string[] {
  const found: string[] = [];
  for (const match of ask.matchAll(PATH_RE)) {
    const path = match[1];
    if (path) found.push(path);
  }
  return [...new Set(found)];
}

export function rootOf(path: string): string {
  const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(path);
  return match ? match[0] : path;
}

/** Channels this ask names, in declaration order. `data` is handled separately. */
export function channelsIn(ask: string): Channel[] {
  const roots = new Set(extractPaths(ask).map(rootOf));
  return CHANNELS.filter((channel) => roots.has(channel));
}

/** Paths that name neither a channel nor `data` — almost always a typo. */
export function unknownRoots(ask: string): string[] {
  const known = new Set<string>([...CHANNELS, 'data']);
  return [...new Set(extractPaths(ask).map(rootOf))].filter((root) => !known.has(root));
}

/**
 * Batching puts several decisions' data in one state, so each decision's data is
 * namespaced under its id and its paths are rewritten to match.
 */
export function namespaceDataPaths(ask: string, id: string): string {
  return ask.replace(PATH_RE, (full, path: string) => {
    if (path === 'data' || path.startsWith('data.') || path.startsWith('data[')) {
      return `\`data.${id}${path.slice('data'.length)}\``;
    }
    return full;
  });
}

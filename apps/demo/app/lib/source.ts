import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Reads a demo's own source off disk at request time, so the code on the page cannot
 * drift from the code that ran. A hand-copied snippet is the thing that goes stale.
 *
 * Blocks between `// docs:omit` and `// docs:end` are replaced with an ellipsis. Those
 * are the parts that are not about this library — mock data and presentational
 * components — and leaving them in buries the three lines a reader came for. Every line
 * that survives is still verbatim.
 */
export function readSource(relativePath: string, elide = true): string {
  const raw = readFileSync(resolve(process.cwd(), relativePath), 'utf8');
  if (!elide) return raw;

  const out: string[] = [];
  let skipping = false;

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    // Markers appear as line comments in TS and as {/* … */} inside JSX.
    const isComment = trimmed.startsWith('//') || trimmed.startsWith('{/*');
    if (isComment && trimmed.includes('docs:omit')) {
      skipping = true;
      const note = trimmed
        .replace(/^\{?\/[/*]\s*/, '')
        .replace(/\*\/\}?$/, '')
        .replace('docs:omit', '')
        .trim();
      const indent = line.slice(0, line.length - line.trimStart().length);
      out.push(`${indent}// … ${note || 'omitted'}`);
      continue;
    }
    if (isComment && trimmed.includes('docs:end')) {
      skipping = false;
      continue;
    }
    if (!skipping) out.push(line);
  }

  // Collapse the runs of blank lines that eliding tends to leave behind.
  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

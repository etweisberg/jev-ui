/**
 * Decision ids become object keys in the batched state and appear inside rewritten
 * question paths, so they must be plain identifiers. React's useId produces things
 * like "«r0»", which are neither.
 */
export function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `d_${cleaned || '0'}`;
}

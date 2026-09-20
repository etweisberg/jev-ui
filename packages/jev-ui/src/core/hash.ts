import { createHash } from 'node:crypto';
import { stableStringify } from './stable.js';

export { stableStringify };

export function fingerprint(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex').slice(0, 16);
}

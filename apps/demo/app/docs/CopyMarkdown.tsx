'use client';

import { CopyButton } from '../lib/CopyButton';

/** Hands the page to an LLM in one click, in the same markdown /llms.txt serves. */
export function CopyMarkdown({ markdown }: { markdown: string }) {
  return (
    <CopyButton
      text={markdown}
      label="copy as markdown"
      doneLabel="copied"
      testId="copy-markdown"
    />
  );
}

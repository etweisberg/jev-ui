/**
 * Confirms a key works and that the API returns the shape the library expects.
 * Run it before recording fixtures: bun run --filter demo check:key
 */
import { TypeSafeClient } from '@typesafe-ai/sdk';

const client = new TypeSafeClient();
const payload = {
  state: {
    data: {
      chart_view: { question: 'How has revenue moved across the last seven quarters?' },
    },
  },
  questions: {
    chart_view: {
      type: 'choice',
      instructions: 'Which view best answers the question in `data.chart_view.question`?',
      criteria: {
        line: 'The question is about a trend across many time periods.',
        table: 'The question needs exact per-row numbers.',
        __none__: 'None of the other options fits.',
      },
    },
  },
  model: 'jev-latest',
};

try {
  const result = await client.systemOne(payload);
  console.log('OK');
  console.log(JSON.stringify(result, null, 2).slice(0, 1200));
} catch (error) {
  console.log('FAILED:', error?.constructor?.name);
  console.log('message:', error?.message);
  for (const key of ['status', 'code', 'body', 'error', 'response']) {
    if (error?.[key] !== undefined) console.log(`${key}:`, JSON.stringify(error[key]).slice(0, 800));
  }
}

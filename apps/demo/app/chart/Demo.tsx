'use client';

import { Branch, Option, type DecisionCost } from 'jev-ui';
import { useState } from 'react';
// docs:omit demo scaffolding — answer panel, mock series, and the four views
import { AnswerStrip } from '../lib/DemoTabs';
import { ControlGroup } from '../lib/Controls';
import { usePick } from '../lib/PickContext';

const SERIES = [
  { quarter: 'Q1 24', emea: 412, amer: 690, apac: 201 },
  { quarter: 'Q2 24', emea: 448, amer: 705, apac: 233 },
  { quarter: 'Q3 24', emea: 501, amer: 688, apac: 259 },
  { quarter: 'Q4 24', emea: 540, amer: 731, apac: 288 },
  { quarter: 'Q1 25', emea: 585, amer: 742, apac: 301 },
  { quarter: 'Q2 25', emea: 618, amer: 760, apac: 342 },
  { quarter: 'Q3 25', emea: 671, amer: 771, apac: 366 },
];

const QUESTIONS = [
  { id: 'trend', label: 'trend', text: 'How has revenue moved across the last seven quarters?' },
  { id: 'compare', label: 'compare', text: 'Which region brought in the most revenue last quarter?' },
  { id: 'exact', label: 'exact', text: 'What did each region bill in Q3 25, to the dollar?' },
  { id: 'single', label: 'headline', text: 'What is total revenue right now?' },
];

const LAST = SERIES[SERIES.length - 1]!;
const total = (row: typeof LAST) => row.emea + row.amer + row.apac;

function LineView() {
  const points = SERIES.map((row, index) => {
    const x = (index / (SERIES.length - 1)) * 300;
    const y = 90 - ((total(row) - 1200) / 700) * 80;
    return `${x},${y}`;
  }).join(' ');
  return (
    <figure data-testid="view-line" style={{ margin: 0 }}>
      <figcaption style={{ fontSize: 11, color: 'var(--muted)' }}>total revenue by quarter</figcaption>
      <svg
        viewBox="0 0 300 100"
        width="100%"
        height="150"
        preserveAspectRatio="none"
        role="img"
        aria-label="Revenue trend"
        style={{ display: 'block', marginTop: 8 }}
      >
        <line x1="0" y1="99" x2="300" y2="99" stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <polyline
          points={points}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </figure>
  );
}

function BarsView() {
  const rows = [
    { region: 'AMER', value: LAST.amer },
    { region: 'EMEA', value: LAST.emea },
    { region: 'APAC', value: LAST.apac },
  ];
  const max = Math.max(...rows.map((row) => row.value));
  return (
    <div data-testid="view-bars">
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>{LAST.quarter} by region</div>
      {rows.map((row) => (
        <div key={row.region} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
          <span style={{ width: 48, fontSize: 11 }}>{row.region}</span>
          <span
            style={{
              height: 12,
              width: `${(row.value / max) * 100}%`,
              background: 'var(--accent)',
              borderRadius: 2,
            }}
          />
          <span style={{ fontSize: 11 }}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function TableView() {
  return (
    <table data-testid="view-table" style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
      <thead>
        <tr>
          {['Quarter', 'EMEA', 'AMER', 'APAC', 'Total'].map((head) => (
            <th
              key={head}
              style={{
                textAlign: 'right',
                padding: '5px 8px',
                borderBottom: '1px solid var(--line)',
                color: 'var(--muted)',
                fontWeight: 500,
              }}
            >
              {head}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {SERIES.map((row) => (
          <tr key={row.quarter}>
            <td style={{ padding: '4px 8px' }}>{row.quarter}</td>
            <td style={{ textAlign: 'right', padding: '4px 8px' }}>{row.emea}</td>
            <td style={{ textAlign: 'right', padding: '4px 8px' }}>{row.amer}</td>
            <td style={{ textAlign: 'right', padding: '4px 8px' }}>{row.apac}</td>
            <td style={{ textAlign: 'right', padding: '4px 8px' }}>{total(row)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatView() {
  return (
    <div data-testid="view-stat">
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>total revenue, {LAST.quarter}</div>
      <div style={{ fontSize: 38, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
        ${total(LAST).toLocaleString()}k
      </div>
    </div>
  );
}
// docs:end

export function ChartDemo() {
  const [question, setQuestion] = useState(QUESTIONS[0]!);
  const [cost, setCost] = useState<DecisionCost | undefined>();
  const { pick, ask } = usePick();

  return (
    <>
      <section className="card" data-testid="demo-live" style={{ display: 'grid', gap: 14 }}>
        {/* docs:omit the controls that drive the demo */}
        <ControlGroup label="what the user asked" hint="the demo's own data, read as `data.question`">
          {QUESTIONS.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              className="ctl"
              role="radio"
              aria-checked={candidate.id === question.id}
              aria-pressed={candidate.id === question.id}
              data-testid={`ask-${candidate.id}`}
              onClick={() => setQuestion(candidate)}
            >
              {candidate.label}
            </button>
          ))}
        </ControlGroup>
        <blockquote style={{ margin: 0, color: 'var(--muted)' }} data-testid="chart-question">
          &ldquo;{question.text}&rdquo;
        </blockquote>
        {/* docs:end */}

        <Branch
          id="chart_view"
          ask={ask}
          data={{ question: question.text, series: SERIES }}
          minConfidence={0.5}
          pick={pick}
          onResolved={setCost}
          pending={<div data-testid="view-pending">resolving…</div>}
        >
          <Option
            k="line"
            when="The question is about a trend, a direction, or how something changed across many time periods."
          >
            <LineView />
          </Option>
          <Option
            k="bars"
            when="The question compares a few named categories against one another at a single point in time."
          >
            <BarsView />
          </Option>
          <Option k="table" when="The question needs exact per-row numbers, or several columns read together.">
            <TableView />
          </Option>
          <Option k="stat" when="The question asks for one headline number and nothing else.">
            <StatView />
          </Option>
          <Option fallback>
            <TableView />
          </Option>
        </Branch>
      </section>

      {/* docs:omit */}
      <AnswerStrip cost={cost} legend={{ chart_view: 'which of the four views renders' }} />
      {/* docs:end */}
    </>
  );
}

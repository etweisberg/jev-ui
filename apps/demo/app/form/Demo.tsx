'use client';

import { Gate, useJev, useScore, type DecisionCost } from 'jev-ui';
import { useState } from 'react';
// docs:omit demo scaffolding — answer panel, controls, mock orders, and the Field component
import { AnswerStrip } from '../lib/DemoTabs';
import { usePick } from '../lib/PickContext';
import { ControlGroup } from '../lib/Controls';

const ORDERS = [
  {
    id: 'domestic',
    label: 'domestic',
    order: {
      shipFrom: 'Columbus, Ohio, United States',
      shipTo: 'Austin, Texas, United States',
      contents: '2 × cotton t-shirt',
      declaredValue: '$48',
      buyer: 'individual',
    },
  },
  {
    id: 'international',
    label: 'international',
    order: {
      shipFrom: 'Columbus, Ohio, United States',
      shipTo: 'Lyon, France',
      contents: '1 × lithium battery pack, 2 × cotton t-shirt',
      declaredValue: '$310',
      buyer: 'individual',
    },
  },
  {
    id: 'business',
    label: 'business, cross-border',
    order: {
      shipFrom: 'Columbus, Ohio, United States',
      shipTo: 'Rotterdam, Netherlands',
      contents: '40 × cotton t-shirt (wholesale)',
      declaredValue: '$7,400',
      buyer: 'registered business',
    },
  },
];

const HELP_LEVELS = [
  'Knows this form well; labels alone are enough',
  'Has done this before but may need a reminder on the unusual fields',
  'New to this; every non-obvious field needs a sentence of explanation',
];

/** What each judgment on this page actually controls, for the answer panel. */
const LEGEND = {
  needs_customs: 'shows the customs fieldset',
  needs_tax_id: 'shows the VAT / tax id field',
  needs_dangerous_goods: 'shows the air-freight warning',
  guidance: 'how much help text every field carries',
};

function Field({ label, help }: { label: string; help?: string }) {
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
      {help ? (
        <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }} data-testid="field-help">
          {help}
        </span>
      ) : null}
      <input className="ctl" style={{ width: '100%', marginTop: 4, cursor: 'text' }} aria-label={label} />
    </label>
  );
}

function CustomsFields({ help }: { help: (text: string) => string | undefined }) {
  return (
    <fieldset data-testid="customs-fields" style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <legend style={{ fontSize: 11, color: 'var(--muted)' }}>customs</legend>
      <Field label="Harmonised system (HS) code" help={help('The tariff code for what you are sending.')} />
      <Field label="Country of origin" help={help('Where the goods were manufactured.')} />
    </fieldset>
  );
}

function TaxFields({ help }: { help: (text: string) => string | undefined }) {
  return (
    <fieldset data-testid="tax-fields" style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <legend style={{ fontSize: 11, color: 'var(--muted)' }}>business</legend>
      <Field label="VAT / tax registration number" help={help('Businesses can reclaim import tax with this.')} />
    </fieldset>
  );
}

function DangerousGoodsNotice() {
  return (
    <div
      data-testid="dangerous-goods-notice"
      style={{ border: '1px solid var(--accent)', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 12 }}
    >
      One or more items may be restricted for air freight. A dangerous-goods declaration is likely required.
    </div>
  );
}
// docs:end

export function FormDemo() {
  const [scenario, setScenario] = useState(ORDERS[0]!);
  const [order, setOrder] = useState(ORDERS[0]!.order);
  const [draft, setDraft] = useState(JSON.stringify(ORDERS[0]!.order, null, 2));
  const [invalid, setInvalid] = useState(false);
  const { state, setState } = useJev();
  const appState = (state.app ?? {}) as Record<string, unknown>;
  const familiarity = String(appState.familiarity ?? '');
  const [cost, setCost] = useState<DecisionCost | undefined>();
  const { pick, ask } = usePick();

  // docs:omit keeps the editable JSON and the presets in sync
  function choose(next: (typeof ORDERS)[number]) {
    setScenario(next);
    setOrder(next.order);
    setDraft(JSON.stringify(next.order, null, 2));
    setInvalid(false);
  }

  function editOrder(text: string) {
    setDraft(text);
    try {
      const parsed = JSON.parse(text);
      setOrder(parsed);
      setInvalid(false);
    } catch {
      // Keep the last valid order so the gates do not thrash while you type.
      setInvalid(true);
    }
  }
  // docs:end

  const guidance = useScore({
    id: 'guidance',
    ask: 'How much explanation does this person need on a shipping form, given `app.familiarity` and what they have done in `recent_actions`?',
    levels: HELP_LEVELS,
    pick,
  });

  const verbose = guidance.normalized >= 0.5;
  const help = (text: string) => (verbose ? text : undefined);

  return (
    <>
      <section className="card" data-testid="demo-live" style={{ display: 'grid', gap: 14 }}>
        {/* docs:omit the controls that drive the demo */}
        <ControlGroup label="the order" hint="what the three Gates read">
          {ORDERS.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              className="ctl"
              role="radio"
              aria-checked={candidate.id === scenario.id}
              aria-pressed={candidate.id === scenario.id}
              data-testid={`order-${candidate.id}`}
              onClick={() => choose(candidate)}
            >
              {candidate.label}
            </button>
          ))}
        </ControlGroup>

        <ControlGroup label="who is filling it in" hint="one of your own app.* fields">
          {(['first visit', 'returning', 'returns often'] as const).map((band) => (
            <button
              key={band}
              type="button"
              className="ctl"
              role="radio"
              aria-checked={familiarity === band}
              aria-pressed={familiarity === band}
              data-testid={`familiarity-${band.replace(/\s+/g, '-')}`}
              onClick={() => setState({ app: { ...appState, familiarity: band } })}
            >
              {band}
            </button>
          ))}
        </ControlGroup>

        <div>
          <div style={{ fontSize: 9.5, letterSpacing: '0.16em', color: 'var(--muted)', marginBottom: 4 }}>
            DATA SENT TO THE GATES
            <span style={{ letterSpacing: 0, textTransform: 'none' }}>
              {' '}
              — edit it and the form below follows
            </span>
          </div>
          <textarea
            className="ctl"
            data-testid="order-json"
            aria-label="Order JSON"
            rows={7}
            value={draft}
            onChange={(event) => editOrder(event.target.value)}
            style={{
              width: '100%',
              fontSize: 11,
              resize: 'vertical',
              borderColor: invalid ? 'var(--accent)' : undefined,
            }}
          />
          {invalid ? (
            <div style={{ fontSize: 10.5, color: 'var(--accent)' }} data-testid="order-json-error">
              not valid JSON — still using the last good version
            </div>
          ) : null}
        </div>

        <div style={{ fontSize: 10.5, color: 'var(--muted)' }} data-testid="guidance-level">
          <strong style={{ color: 'var(--fg)' }}>useScore</strong> read &ldquo;{familiarity}&rdquo;
          and returned {guidance.normalized.toFixed(2)} — {guidance.level.toLowerCase()} — so verbose
          help is <strong style={{ color: 'var(--fg)' }}>{verbose ? 'on' : 'off'}</strong> for every
          field below.
        </div>
        {/* docs:end */}

        <form data-testid="shipping-form" onSubmit={(event) => event.preventDefault()}>
          <Field label="Recipient name" />
          <Field label="Delivery address" />

          <Gate
            id="needs_customs"
            ask={ask}
            data={{ order }}
            pick={pick}
            threshold={0.6}
            onResolved={setCost}
          >
            <CustomsFields help={help} />
          </Gate>

          <Gate
            id="needs_tax_id"
            ask="Does the buyer in `data.order` appear to be a registered business rather than an individual, so that a tax registration number should be collected?"
            data={{ order }}
            pick={pick}
            threshold={0.6}
          >
            <TaxFields help={help} />
          </Gate>

          <Gate
            id="needs_dangerous_goods"
            ask="Do the contents in `data.order` include anything restricted for air freight, such as batteries, aerosols, or flammable liquids?"
            data={{ order }}
            pick={pick}
            threshold={0.6}
          >
            <DangerousGoodsNotice />
          </Gate>

          <button type="submit" className="ctl">
            Continue
          </button>
        </form>
      </section>

      {/* docs:omit */}
      <AnswerStrip cost={cost} legend={LEGEND} />
      {/* docs:end */}
    </>
  );
}

import type { ReactNode } from 'react';
import { DemoTabs, type MappingRow } from './DemoTabs';
import { DemoConfig } from './DemoConfig';
import { PickProvider } from './PickContext';
import { readSource } from './source';

export interface DemoShellProps {
  title: string;
  blurb: ReactNode;
  /** Path, relative to the demo app root, of the component that is actually running. */
  sourcePath: string;
  primitive: string;
  mapping: MappingRow[];
  /** Set when this demo wires its controls to the snippet. */
  liveEnabled?: boolean;
  /** The question the demo starts from, editable in the UI. */
  defaultAsk?: string;
  /** The live component, plus its answer strip. */
  children: ReactNode;
}

/**
 * One column, in the order you'd read it: what the question is and what state it gets,
 * then the thing that renders, then what came back, then the code.
 *
 * The configuration used to be split — the question and the channel picker inside the
 * demo card, the state values in a sidebar — which put one idea in two places.
 */
export function DemoShell({
  title,
  blurb,
  sourcePath,
  primitive,
  mapping,
  liveEnabled,
  defaultAsk = '',
  children,
}: DemoShellProps) {
  const source = readSource(sourcePath);
  return (
    <>
      <h1>{title}</h1>
      <p className="blurb">{blurb}</p>
      <PickProvider defaultAsk={defaultAsk}>
        <div style={{ display: 'grid', gap: 22, gridTemplateColumns: 'minmax(0, 1fr)' }}>
          <DemoConfig />
          {children}
          <DemoTabs
            source={source}
            sourcePath={sourcePath}
            mapping={mapping}
            primitive={primitive}
            {...(liveEnabled ? { liveEnabled } : {})}
          />
        </div>
      </PickProvider>
    </>
  );
}

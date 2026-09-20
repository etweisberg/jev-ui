import type { ReactNode } from 'react';
import { slugify, type Block } from './content';

/** Renders `inline code` spans without pulling in a markdown parser. */
function inline(text: string): ReactNode[] {
  return text.split(/(`[^`]+`)/g).map((part, index) =>
    part.startsWith('`') && part.endsWith('`') && part.length > 2 ? (
      <code key={index} style={{ color: 'var(--fg)' }}>
        {part.slice(1, -1)}
      </code>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {blocks.map((block, index) => {
        switch (block.t) {
          case 'h':
            return (
              <h2
                key={index}
                id={slugify(block.text)}
                // Anchored sections sit below the sticky tab bar when linked to.
                style={{ marginTop: index === 0 ? 0 : 12, marginBottom: 0, scrollMarginTop: 80 }}
              >
                <a href={`#${slugify(block.text)}`} style={{ textDecoration: 'none' }}>
                  {block.text}
                </a>
              </h2>
            );
          case 'p':
            return (
              <p key={index} style={{ margin: 0, maxWidth: '78ch', color: 'var(--muted)' }}>
                {inline(block.text)}
              </p>
            );
          case 'note':
            return (
              <p
                key={index}
                style={{
                  margin: 0,
                  maxWidth: '78ch',
                  padding: '10px 14px',
                  borderLeft: '2px solid var(--accent)',
                  background: 'var(--panel)',
                  borderRadius: '0 6px 6px 0',
                }}
              >
                {inline(block.text)}
              </p>
            );
          case 'code':
            return (
              <pre key={index} className="src">
                {block.text}
              </pre>
            );
          case 'list':
            return (
              <ul key={index} style={{ margin: 0, paddingLeft: 18, maxWidth: '78ch', color: 'var(--muted)' }}>
                {block.items.map((item) => (
                  <li key={item} style={{ marginBottom: 6 }}>
                    {inline(item)}
                  </li>
                ))}
              </ul>
            );
          case 'table':
            return (
              <div key={index} style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11.5 }}>
                  <thead>
                    <tr>
                      {block.head.map((head) => (
                        <th
                          key={head}
                          style={{
                            textAlign: 'left',
                            padding: '8px 12px',
                            background: 'var(--panel)',
                            borderBottom: '1px solid var(--line)',
                            color: 'var(--muted)',
                            fontWeight: 500,
                            fontSize: 10,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                          }}
                        >
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            style={{
                              padding: '8px 12px',
                              borderTop: rowIndex === 0 ? 'none' : '1px solid var(--line-soft)',
                              verticalAlign: 'top',
                              background: 'var(--panel)',
                            }}
                          >
                            {inline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}

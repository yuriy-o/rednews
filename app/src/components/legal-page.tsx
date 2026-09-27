import type { ReactNode } from 'react';

interface LegalBlock {
  type: 'p' | 'ul';
  text?: string;
  items?: string[];
}

interface LegalSection {
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalContent {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
  closing?: string;
}

/** `[label](url)` inside legal copy becomes a real link; everything else renders as plain text. */
function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = linkPattern.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <a key={key++} href={match[2]}>
        {match[1]}
      </a>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function LegalPage({ content }: { content: LegalContent }) {
  return (
    <div className="container page legal">
      <h1 className="h2">{content.title}</h1>
      <p className="legal__updated data">{content.updated}</p>
      <p className="lead">{content.intro}</p>
      {content.sections.map((section) => (
        <section key={section.heading}>
          <h2 className="h3">{section.heading}</h2>
          {section.blocks.map((block, i) =>
            block.type === 'ul' ? (
              <ul key={i}>
                {block.items!.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ul>
            ) : (
              <p key={i}>{renderInline(block.text!)}</p>
            ),
          )}
        </section>
      ))}
      {content.closing && <p className="lead legal__closing">{renderInline(content.closing)}</p>}
    </div>
  );
}

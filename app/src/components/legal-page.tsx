import type { ReactNode } from 'react';
import type { Locale } from '@/i18n/config';
import { localeDir } from '@/i18n/config';

interface LegalBlock {
  // Sourced from en.json: TypeScript's JSON module inference widens this to `string`, not the
  // literal union, once the array mixes { type, text } and { type, items } shapes.
  type: string;
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

/**
 * `[label](url)` inside legal copy becomes a real link; everything else renders as plain text.
 * An http(s) link (Discord, the legacy AI guide, ...) opens in a new tab so visitors don't lose
 * this site; `mailto:` opens the OS mail client instead, so it's left to navigate normally.
 */
function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = linkPattern.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const url = match[2];
    const external = url.startsWith('http://') || url.startsWith('https://');
    parts.push(
      <a key={key++} href={url} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {match[1]}
      </a>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function LegalPage({ content, locale }: { content: LegalContent; locale: Locale }) {
  return (
    // Now genuinely translated per locale (see dictionaries/*.json), so it follows the
    // locale's own direction — rtl for ar/ur — instead of a hardcoded ltr.
    <div className="container page legal" dir={localeDir(locale)}>
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

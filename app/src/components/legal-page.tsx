import type { ReactNode } from 'react';
import type { Locale } from '@/i18n/config';
import { localeDir } from '@/i18n/config';
import { localePath } from '@/lib/seo';

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
 * `[label](url)` becomes a link, `**bold**` becomes `<strong>`, `` `code` `` becomes `<code>` —
 * everything else renders as plain text. An http(s) link (Discord, a provider's docs, ...) opens
 * in a new tab so visitors don't lose this site; `mailto:` and root-relative links (prefixed with
 * the current locale, e.g. `/ai` → `/de/ai`) open in the same tab instead.
 */
function renderInline(text: string, locale: Locale): ReactNode[] {
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;
  const parts: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1] !== undefined) {
      const url = match[2];
      const external = url.startsWith('http://') || url.startsWith('https://');
      const href = !external && url.startsWith('/') ? localePath(locale, url) : url;
      parts.push(
        <a key={key++} href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
          {match[1]}
        </a>,
      );
    } else if (match[3] !== undefined) {
      parts.push(<strong key={key++}>{match[3]}</strong>);
    } else {
      parts.push(<code key={key++}>{match[4]}</code>);
    }
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
                  <li key={j}>{renderInline(item, locale)}</li>
                ))}
              </ul>
            ) : block.type === 'ol' ? (
              <ol key={i}>
                {block.items!.map((item, j) => (
                  <li key={j}>{renderInline(item, locale)}</li>
                ))}
              </ol>
            ) : block.type === 'note' ? (
              <p key={i} className="legal__note">
                {renderInline(block.text!, locale)}
              </p>
            ) : (
              <p key={i}>{renderInline(block.text!, locale)}</p>
            ),
          )}
        </section>
      ))}
      {content.closing && <p className="lead legal__closing">{renderInline(content.closing, locale)}</p>}
    </div>
  );
}

import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';
import { localePath } from '@/lib/seo';

// Legal pages still live on the legacy static site until they are migrated.
const LEGACY = 'https://rednews.app';

export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <p>
          © {new Date().getFullYear()} {dict.meta.siteName}. {dict.footer.source}
        </p>
        <nav aria-label="Footer">
          <ul className="footer-links">
            <li>
              <Link href={localePath(locale, '/calendar')}>{dict.nav.calendar}</Link>
            </li>
            <li>
              <Link href={localePath(locale, '/pricing')}>{dict.nav.pricing}</Link>
            </li>
            <li>
              <a href={`${LEGACY}/privacy.html`}>{dict.footer.privacy}</a>
            </li>
            <li>
              <a href={`${LEGACY}/terms.html`}>{dict.footer.terms}</a>
            </li>
            <li>
              <a href={`${LEGACY}/refund.html`}>{dict.footer.refund}</a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}

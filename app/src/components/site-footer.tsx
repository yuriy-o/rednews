import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';
import { localePath } from '@/lib/seo';

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
              <Link href={localePath(locale, '/privacy')}>{dict.footer.privacy}</Link>
            </li>
            <li>
              <Link href={localePath(locale, '/terms')}>{dict.footer.terms}</Link>
            </li>
            <li>
              <Link href={localePath(locale, '/refund')}>{dict.footer.refund}</Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}

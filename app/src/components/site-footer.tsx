import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';
import { localePath } from '@/lib/seo';
import { NavLink } from './nav-link';

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
              <NavLink href={localePath(locale, '/calendar')}>{dict.nav.calendar}</NavLink>
            </li>
            <li>
              <NavLink href={localePath(locale, '/pricing')}>{dict.nav.pricing}</NavLink>
            </li>
            {/* dict.legal is an untranslated (English) copy in every locale's dictionary, so the
                content itself doesn't change here — only the URL segment does, keeping the header/
                footer chrome and further navigation in the visitor's chosen locale instead of
                stranding them on English after one visit to a legal page. */}
            <li>
              <NavLink href={localePath(locale, '/privacy')}>{dict.footer.privacy}</NavLink>
            </li>
            <li>
              <NavLink href={localePath(locale, '/terms')}>{dict.footer.terms}</NavLink>
            </li>
            <li>
              <NavLink href={localePath(locale, '/refund')}>{dict.footer.refund}</NavLink>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}

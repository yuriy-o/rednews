import Image from 'next/image';
import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';
import { localePath } from '@/lib/seo';
import { ThemeToggle } from './theme';
import { MobileNav } from './mobile-nav';

export const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/amfdnacihpdhedfadbcoeeoijnfpnllf';

export function SiteHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const nav = [
    { href: localePath(locale, '/calendar'), label: dict.nav.calendar },
    { href: localePath(locale, '/pricing'), label: dict.nav.pricing },
    { href: localePath(locale, '/account'), label: dict.nav.account },
  ];

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link href={localePath(locale)} className="brand">
          <Image src="/red-news-logo-128.png" alt="" width={28} height={28} priority />
          <span className="brand__name">{dict.meta.siteName}</span>
        </Link>
        <nav aria-label="Main">
          <ul className="nav-list">
            {nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="site-header__actions">
          <span className="header-theme">
            <ThemeToggle label={dict.theme.toggle} />
          </span>
          <a className="button button--primary button--sm" href={CHROME_STORE_URL} target="_blank" rel="noopener">
            {dict.nav.install}
          </a>
          <MobileNav
            items={nav}
            openLabel={dict.nav.menuOpen}
            closeLabel={dict.nav.menuClose}
            theme={{ label: dict.theme.label, toggle: dict.theme.toggle }}
          />
        </div>
      </div>
    </header>
  );
}

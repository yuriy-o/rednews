import Image from 'next/image';
import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';
import { localePath } from '@/lib/seo';
import { ThemeToggle } from './theme';

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
          <span>{dict.meta.siteName}</span>
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
          <ThemeToggle label={dict.theme.toggle} />
          <a className="button button--primary" href={CHROME_STORE_URL} target="_blank" rel="noopener">
            {dict.nav.install}
          </a>
        </div>
      </div>
    </header>
  );
}

import { NextResponse, type NextRequest } from 'next/server';
import { allLocales, defaultLocale, enabledLocales, type Locale } from './i18n/config';

export const LOCALE_COOKIE = 'rn-locale';

/** Best enabled locale for an Accept-Language header: exact tag first, then base language. */
function negotiate(header: string | null): Locale {
  if (!header) return defaultLocale;
  const wanted = header
    .split(',')
    .map((part) => {
      const [tag = '', q] = part.trim().split(';q=');
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
    })
    .filter((w) => w.tag && !Number.isNaN(w.q))
    .sort((a, b) => b.q - a.q);

  for (const { tag } of wanted) {
    const exact = enabledLocales.find((l) => l === tag);
    if (exact) return exact;
    const base = tag.split('-')[0];
    const byBase = enabledLocales.find((l) => l === base || l.split('-')[0] === base);
    if (byBase) return byBase;
  }
  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split('/')[1] ?? '';

  if ((enabledLocales as readonly string[]).includes(first)) return;

  // A known-but-disabled locale (e.g. /de before German ships) goes to the default instead of 404.
  const rest = first in allLocales ? pathname.slice(first.length + 1) || '/' : pathname;

  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale =
    saved && (enabledLocales as readonly string[]).includes(saved)
      ? (saved as Locale)
      : negotiate(request.headers.get('accept-language'));

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${rest === '/' ? '' : rest}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next internals, metadata routes and any file with an extension.
  matcher: ['/((?!_next|api|sitemap.xml|robots.txt|manifest.webmanifest|.*\\..*).*)'],
};

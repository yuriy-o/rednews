import type { Metadata } from 'next';
import { defaultLocale, enabledLocales, localeHreflang, type Locale } from '@/i18n/config';

// Absolute origin of the site. Launching on a subdomain and moving to rednews.app later is a
// change of this one env var: canonicals, hreflang, sitemap and OG URLs all derive from it.
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/** Path within a locale, e.g. localePath('en', '/calendar') → '/en/calendar'. */
export const localePath = (locale: Locale, path = '/') => `/${locale}${path === '/' ? '' : path}`;

/** hreflang map for every enabled locale plus x-default. */
export function languageAlternates(path = '/'): Record<string, string> {
  const map: Record<string, string> = {};
  for (const l of enabledLocales) map[localeHreflang(l)] = `${siteUrl}${localePath(l, path)}`;
  map['x-default'] = `${siteUrl}${localePath(defaultLocale, path)}`;
  return map;
}

interface PageMeta {
  locale: Locale;
  path: string;
  title: string;
  description?: string;
  /** Private or unfinished pages (noindex, nofollow); 'follow' keeps links crawlable. */
  noindex?: boolean | 'follow';
}

// Explicit rather than an `opengraph-image` file: a page's own `openGraph` object replaces the
// parent's, which silently dropped the file-based image on every page except the home page.
const shareImage = { url: '/og-image.png', width: 1200, height: 630, alt: 'Red News' };

export function pageMetadata({ locale, path, title, description, noindex }: PageMeta): Metadata {
  const url = `${siteUrl}${localePath(locale, path)}`;
  return {
    title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      siteName: 'Red News',
      locale: localeHreflang(locale).replace('-', '_'),
      images: [shareImage],
    },
    twitter: { card: 'summary_large_image', title, description, images: [shareImage.url] },
    ...(noindex ? { robots: { index: false, follow: noindex === 'follow' } } : {}),
  };
}

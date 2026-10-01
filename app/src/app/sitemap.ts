import type { MetadataRoute } from 'next';
import { enabledLocales } from '@/i18n/config';
import { languageAlternates, localePath, siteUrl } from '@/lib/seo';

// Public, indexable pages only (the account area is private).
const pages: { path: string; changeFrequency: 'daily' | 'weekly' | 'monthly'; priority: number }[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/calendar', changeFrequency: 'daily', priority: 0.9 },
  { path: '/pricing', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/ai', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/privacy', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/refund', changeFrequency: 'monthly', priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return enabledLocales.flatMap((locale) =>
    pages.map((p) => ({
      url: `${siteUrl}${localePath(locale, p.path)}`,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
      alternates: { languages: languageAlternates(p.path) },
    })),
  );
}

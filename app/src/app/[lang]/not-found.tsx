import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getDictionary, getLocale } from '@/i18n/dictionaries';
import { localePath, pageMetadata } from '@/lib/seo';
import { BrokenChart } from '@/components/not-found/broken-chart';

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return pageMetadata({ locale, path: '/404', title: dict.notFound.title, noindex: true });
}

export default async function NotFound() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  const t = dict.notFound;
  return (
    <div className="container page not-found">
      <BrokenChart label={t.flag} />
      <h1 className="h2 not-found__title">{t.title}</h1>
      <p className="lead">{t.lead}</p>
      <p className="actions">
        <Link className="button button--primary" href={localePath(locale)}>
          {t.back}
        </Link>
        <Link className="text-link" href={localePath(locale, '/calendar')}>
          {t.secondary}
          <ArrowRight size={16} strokeWidth={1.75} aria-hidden />
        </Link>
      </p>
    </div>
  );
}

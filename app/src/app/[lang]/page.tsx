import type { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary, getLocale } from '@/i18n/dictionaries';
import { localePath, pageMetadata } from '@/lib/seo';
import { CHROME_STORE_URL } from '@/components/site-header';

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  // Home uses the full brand title rather than the "%s | Red News" template.
  const meta = pageMetadata({ locale, path: '/', ...dict.meta.home });
  return { ...meta, title: { absolute: `${dict.meta.siteName} — ${dict.meta.home.title}` } };
}

export default async function HomePage() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: dict.meta.siteName,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Chrome',
    description: dict.meta.home.description,
    installUrl: CHROME_STORE_URL,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };

  return (
    <div className="container page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <h1>{dict.home.title}</h1>
      <p className="lead">{dict.home.lead}</p>
      <p className="actions">
        <a className="button button--primary" href={CHROME_STORE_URL} target="_blank" rel="noopener">
          {dict.nav.install}
        </a>
        <Link className="button" href={localePath(locale, '/calendar')}>
          {dict.nav.calendar}
        </Link>
      </p>
    </div>
  );
}

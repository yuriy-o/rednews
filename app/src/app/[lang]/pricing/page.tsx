import type { Metadata } from 'next';
import { getDictionary, getLocale } from '@/i18n/dictionaries';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return pageMetadata({ locale, path: '/pricing', ...dict.meta.pricing });
}

export default async function PricingPage() {
  const dict = await getDictionary();
  return (
    <div className="container page">
      <h1 className="h2">{dict.pricing.title}</h1>
      <p className="lead">{dict.pricing.lead}</p>
    </div>
  );
}

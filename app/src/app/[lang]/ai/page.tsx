import type { Metadata } from 'next';
import { getDictionary, getLocale } from '@/i18n/dictionaries';
import { pageMetadata } from '@/lib/seo';
import { LegalPage } from '@/components/legal-page';

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return pageMetadata({ locale, path: '/ai', ...dict.meta.ai });
}

export default async function AiPage() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return <LegalPage content={dict.ai} locale={locale} />;
}

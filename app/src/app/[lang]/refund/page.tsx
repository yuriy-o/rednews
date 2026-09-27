import type { Metadata } from 'next';
import { getDictionary, getLocale } from '@/i18n/dictionaries';
import { pageMetadata } from '@/lib/seo';
import { LegalPage } from '@/components/legal-page';

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return pageMetadata({ locale, path: '/refund', ...dict.meta.refund });
}

export default async function RefundPage() {
  const dict = await getDictionary();
  return <LegalPage content={dict.legal.refund} />;
}

import type { Metadata } from 'next';
import { getDictionary, getLocale } from '@/i18n/dictionaries';
import { pageMetadata } from '@/lib/seo';
import { CalendarScreen } from '@/components/calendar/calendar-screen';

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return pageMetadata({ locale, path: '/calendar', ...dict.meta.calendar });
}

export default async function CalendarPage() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return <CalendarScreen locale={locale} dict={dict} />;
}

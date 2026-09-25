import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getDictionary, getLocale } from '@/i18n/dictionaries';
import { localePath, pageMetadata } from '@/lib/seo';
import { currentWeekStart, formatWeekRange, isWeekStart } from '@/lib/ff-week';
import { CalendarScreen } from '@/components/calendar/calendar-screen';

export async function generateMetadata({ params }: PageProps<'/[lang]/calendar/[week]'>): Promise<Metadata> {
  const [{ week }, locale, dict] = await Promise.all([params, getLocale(), getDictionary()]);
  if (!isWeekStart(week)) return {};
  // Other weeks change as the calendar moves; only /calendar (this week) is indexed.
  return pageMetadata({
    locale,
    path: `/calendar/${week}`,
    title: `${dict.meta.calendar.weekTitle} ${formatWeekRange(week, locale)}`,
    description: dict.meta.calendar.description,
    noindex: 'follow',
  });
}

export default async function CalendarWeekPage({ params }: PageProps<'/[lang]/calendar/[week]'>) {
  const [{ week }, locale, dict] = await Promise.all([params, getLocale(), getDictionary()]);
  if (!isWeekStart(week)) notFound();
  if (week === currentWeekStart()) redirect(localePath(locale, '/calendar'));
  return <CalendarScreen locale={locale} dict={dict} week={week} />;
}

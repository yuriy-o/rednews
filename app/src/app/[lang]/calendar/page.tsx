import type { Metadata } from 'next';
import { getDictionary, getLocale } from '@/i18n/dictionaries';
import { pageMetadata } from '@/lib/seo';
import { calendarApi, type EventsResponse } from '@/lib/api';
import { CalendarTable } from '@/components/calendar-table';

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return pageMetadata({ locale, path: '/calendar', ...dict.meta.calendar });
}

export default async function CalendarPage() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);

  let data: EventsResponse | null = null;
  try {
    data = await calendarApi.week();
  } catch {
    // API down or cold-starting: render the page with a message instead of failing the route.
  }

  return (
    <div className="container page">
      <h1>{dict.calendar.title}</h1>
      <p className="lead">{dict.calendar.lead}</p>
      {!data ? (
        <p role="status">{dict.calendar.unavailable}</p>
      ) : data.events.length === 0 ? (
        <p>{dict.calendar.empty}</p>
      ) : (
        <CalendarTable events={data.events} locale={locale} t={dict.calendar} />
      )}
    </div>
  );
}

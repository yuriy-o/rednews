'use client';

import { useSyncExternalStore } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { CalendarEvent } from '@/lib/api';
import type { Dictionary } from '@/i18n/dictionaries';

const noopSubscribe = () => () => {};
const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Renders in UTC on the server (crawlers, first paint), then in the visitor's own timezone. */
function useTimeZone(): string {
  return useSyncExternalStore(noopSubscribe, browserTimeZone, () => 'UTC');
}

interface Props {
  events: CalendarEvent[];
  locale: string;
  t: Dictionary['calendar'];
}

export function CalendarTable({ events, locale, t }: Props) {
  const timeZone = useTimeZone();
  const dayFmt = new Intl.DateTimeFormat(locale, { timeZone, weekday: 'long', day: 'numeric', month: 'long' });
  const timeFmt = new Intl.DateTimeFormat(locale, { timeZone, hour: '2-digit', minute: '2-digit' });

  const days = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const key = dayFmt.format(e.ts * 1000);
    days.set(key, [...(days.get(key) ?? []), e]);
  }

  return (
    <div className="calendar">
      <p className="calendar__tz data">{timeZone}</p>
      {[...days].map(([day, list]) => (
        <section key={day} aria-label={day}>
          <h2 className="calendar__day">{day}</h2>
          <table className="calendar__table">
            <thead>
              <tr>
                <th scope="col">{t.columns.time}</th>
                <th scope="col">{t.columns.currency}</th>
                <th scope="col">{t.columns.impact}</th>
                <th scope="col">{t.columns.event}</th>
                <th scope="col">{t.columns.actual}</th>
                <th scope="col">{t.columns.forecast}</th>
                <th scope="col">{t.columns.previous}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id}>
                  <td>
                    <time dateTime={new Date(e.ts * 1000).toISOString()}>{timeFmt.format(e.ts * 1000)}</time>
                  </td>
                  <td>{e.currency}</td>
                  <td>
                    {/* Impact is shown as text + marker, never colour alone. */}
                    <span className={`impact impact--${e.impact.toLowerCase()}`}>{t.impact[e.impact]}</span>
                  </td>
                  <td>{e.title}</td>
                  <td>
                    {e.actual}
                    {e.outcome === 'better' && (
                      <span className="bw bw--better" role="img" aria-label={t.better} title={t.better}>
                        <ArrowUp size={14} strokeWidth={2} aria-hidden />
                      </span>
                    )}
                    {e.outcome === 'worse' && (
                      <span className="bw bw--worse" role="img" aria-label={t.worse} title={t.worse}>
                        <ArrowDown size={14} strokeWidth={2} aria-hidden />
                      </span>
                    )}
                  </td>
                  <td>{e.forecast}</td>
                  <td>{e.previous}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}

'use client';

import type { CalendarEvent } from '@/lib/api';
import type { Dictionary } from '@/i18n/dictionaries';
import { formatCountdown, useNow, useTimeZone } from '@/lib/use-time';
import styles from './upcoming-list.module.css';

interface Props {
  events: CalendarEvent[];
  locale: string;
  limit: number;
  t: Dictionary['home']['upcoming'];
  impactLabels: Dictionary['calendar']['impact'];
}

export function UpcomingList({ events, locale, limit, t, impactLabels }: Props) {
  const timeZone = useTimeZone();
  const now = useNow();
  const fmt = new Intl.DateTimeFormat(locale, { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit' });

  // Server render lists from the start of the fetched window; the client drops what already happened.
  const list = (now === null ? events : events.filter((e) => e.ts > now)).slice(0, limit);
  if (!list.length) return <p className={styles.empty}>{t.empty}</p>;

  return (
    <ol className={styles.list}>
      {list.map((e) => (
        <li key={e.id} className={styles.row}>
          <time className="data" dateTime={new Date(e.ts * 1000).toISOString()}>
            {fmt.format(e.ts * 1000)}
          </time>
          <span className={`impact impact--${e.impact.toLowerCase()} ${styles.impact}`}>
            <span className={styles.impactLabel}>{impactLabels[e.impact]}</span>
          </span>
          <span className={styles.event}>
            <span className={styles.ccy}>{e.currency}</span> {e.title}
          </span>
          <span className={`${styles.meta} data`}>
            {e.forecast && (
              <>
                {t.forecast} {e.forecast}
              </>
            )}
          </span>
          <span className={`${styles.countdown} data`}>{now !== null && `${t.in} ${formatCountdown(e.ts - now)}`}</span>
        </li>
      ))}
    </ol>
  );
}

import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';
import { ApiError, calendarApi, type CalendarEvent } from '@/lib/api';
import { addDays, formatWeekRange, isWeekInWindow, weekStartOf } from '@/lib/ff-week';
import { FILTER_COOKIE, parseFilterCookie } from '@/lib/calendar-filters';
import { localePath } from '@/lib/seo';
import { TZ_COOKIE } from '@/components/theme-script';
import { CalendarView } from './calendar-view';
import styles from './calendar-screen.module.css';

interface Props {
  locale: Locale;
  dict: Dictionary;
  /** Week to show (a Sunday); the current week when omitted. */
  week?: string;
}

const weekHref = (locale: Locale, ws: string, current: string) =>
  localePath(locale, ws === current ? '/calendar' : `/calendar/${ws}`);

function validTimeZone(tz: string | undefined): string {
  if (!tz) return 'UTC';
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

/** Everything that depends on the request time, loaded outside render. */
async function loadWeekView(week: string | undefined) {
  const nowMs = Date.now();
  const current = weekStartOf(Math.floor(nowMs / 1000));
  const ws = week ?? current;
  const inWindow = isWeekInWindow(ws, nowMs);

  let events: CalendarEvent[] | null = null;
  let premium = !inWindow;
  if (inWindow) {
    try {
      events = (await calendarApi.week(undefined, week)).events;
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) premium = true;
    }
  }
  const prev = addDays(ws, -7);
  const next = addDays(ws, 7);
  return { ws, current, events, premium, prev, next, prevOk: isWeekInWindow(prev, nowMs), nextOk: isWeekInWindow(next, nowMs) };
}

export async function CalendarScreen({ locale, dict, week }: Props) {
  const t = dict.calendar;
  const [{ ws, current, events, premium, prev, next, prevOk, nextOk }, jar, head] = await Promise.all([
    loadWeekView(week),
    cookies(),
    headers(),
  ]);
  const filters = parseFilterCookie(jar.get(FILTER_COOKIE)?.value);
  // Remembered timezone first; on a first visit, Vercel's IP-based guess — so days are grouped
  // correctly before hydration and nothing regroups (layout shift) once the browser's zone is known.
  const serverTimeZone = validTimeZone(jar.get(TZ_COOKIE)?.value ?? head.get('x-vercel-ip-timezone') ?? undefined);

  return (
    <div className="container page">
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>{t.title}</h1>
          <p className={`${styles.range} data`}>
            {formatWeekRange(ws, locale)}
            {ws === current && <span className={styles.thisWeek}>{t.thisWeek}</span>}
          </p>
        </div>
        <nav className={styles.nav} aria-label={t.weekNav}>
          {prevOk ? (
            <Link className="icon-button" href={weekHref(locale, prev, current)} aria-label={t.prevWeek} title={t.prevWeek}>
              <ChevronLeft size={18} strokeWidth={1.75} aria-hidden />
            </Link>
          ) : (
            <span
              className={`icon-button ${styles.disabled}`}
              role="img"
              aria-label={`${t.prevWeek}: ${t.premiumRange}`}
              title={t.premiumRange}
            >
              <ChevronLeft size={18} strokeWidth={1.75} aria-hidden />
            </span>
          )}
          <Link className="button button--sm" href={`${localePath(locale, '/calendar')}#today`}>
            {t.today}
          </Link>
          {nextOk ? (
            <Link className="icon-button" href={weekHref(locale, next, current)} aria-label={t.nextWeek} title={t.nextWeek}>
              <ChevronRight size={18} strokeWidth={1.75} aria-hidden />
            </Link>
          ) : (
            <span
              className={`icon-button ${styles.disabled}`}
              role="img"
              aria-label={`${t.nextWeek}: ${t.premiumRange}`}
              title={t.premiumRange}
            >
              <ChevronRight size={18} strokeWidth={1.75} aria-hidden />
            </span>
          )}
        </nav>
      </div>

      {premium ? (
        <div className={styles.notice}>
          <p className={styles.noticeTitle}>{t.premiumTitle}</p>
          <p>{t.premiumBody}</p>
          <p className="actions">
            <Link className="button button--primary" href={localePath(locale, '/pricing')}>
              {t.premiumCta}
            </Link>
            <Link className="text-link" href={localePath(locale, '/calendar')}>
              {t.backToThisWeek}
            </Link>
          </p>
        </div>
      ) : !events ? (
        <p className={styles.notice} role="status">
          {t.unavailable}
        </p>
      ) : events.length === 0 ? (
        <p className={styles.notice}>{t.empty}</p>
      ) : (
        <CalendarView events={events} initialFilters={filters} serverTimeZone={serverTimeZone} locale={locale} t={t} />
      )}
    </div>
  );
}

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
  // An arrow exists if either end of the step is inside the window: from the edge week it leads
  // to the Premium note (never fetched); from a Premium week only back toward the window.
  const reach = (other: string) => {
    const otherIn = isWeekInWindow(other, nowMs);
    return { show: inWindow || otherIn, premium: !otherIn };
  };
  return { ws, current, events, premium, prev, next, prevNav: reach(prev), nextNav: reach(next), nowSec: Math.floor(nowMs / 1000) };
}

function WeekArrow({ href, label, premium, premiumNote, dir }: { href: string; label: string; premium: boolean; premiumNote: string; dir: 'prev' | 'next' }) {
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight;
  return (
    <Link
      className="icon-button"
      href={href}
      aria-label={premium ? `${label}: ${premiumNote}` : label}
      title={premium ? premiumNote : label}
      // Premium weeks are a dead end for crawlers; keep them out of the crawl.
      rel={premium ? 'nofollow' : undefined}
      data-premium={premium || undefined}
    >
      <Icon size={18} strokeWidth={1.75} aria-hidden />
    </Link>
  );
}

export async function CalendarScreen({ locale, dict, week }: Props) {
  const t = dict.calendar;
  const [{ ws, current, events, premium, prev, next, prevNav, nextNav, nowSec }, jar, head] = await Promise.all([
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
          {prevNav.show ? (
            <WeekArrow href={weekHref(locale, prev, current)} label={t.prevWeek} premium={prevNav.premium} premiumNote={t.premiumRange} dir="prev" />
          ) : (
            <span className={styles.navSpacer} aria-hidden="true" />
          )}
          <Link className="button button--sm" href={`${localePath(locale, '/calendar')}#today`}>
            {t.today}
          </Link>
          {nextNav.show ? (
            <WeekArrow href={weekHref(locale, next, current)} label={t.nextWeek} premium={nextNav.premium} premiumNote={t.premiumRange} dir="next" />
          ) : (
            <span className={styles.navSpacer} aria-hidden="true" />
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
        <CalendarView
          events={events}
          initialFilters={filters}
          serverTimeZone={serverTimeZone}
          serverNow={nowSec}
          isCurrentWeek={ws === current}
          locale={locale}
          t={t}
        />
      )}
    </div>
  );
}

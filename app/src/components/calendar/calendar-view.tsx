'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Search, X } from 'lucide-react';
import type { CalendarEvent, Impact } from '@/lib/api';
import type { Dictionary } from '@/i18n/dictionaries';
import { formatCountdown, useNow, useTimeZone } from '@/lib/use-time';
import {
  CURRENCIES,
  FILTER_COOKIE,
  IMPACTS,
  defaultFilters,
  isDefaultFilters,
  serializeFilterCookie,
  type CalendarFilters,
} from '@/lib/calendar-filters';
import styles from './calendar-view.module.css';

interface Props {
  events: CalendarEvent[];
  initialFilters: CalendarFilters;
  serverTimeZone: string;
  /** Request time (unix s): lets the server mark "today" so a #today link scrolls on first load. */
  serverNow: number;
  /** Whether this page shows the current FF week (only then is there a "today"). */
  isCurrentWeek: boolean;
  locale: string;
  t: Dictionary['calendar'];
}

function saveFilters(f: CalendarFilters) {
  // One year; path-wide so every locale and week page reads the same choice.
  document.cookie = `${FILTER_COOKIE}=${serializeFilterCookie(f)}; path=/; max-age=31536000; samesite=lax`;
}

function toggle<T>(list: T[], item: T, order: readonly T[]): T[] {
  if (list.includes(item)) return list.filter((x) => x !== item);
  return order.filter((x) => x === item || list.includes(x));
}

/** "GMT+3 · Eastern European Time" — readable, and avoids exposing raw IANA ids. */
function zoneLabel(timeZone: string, locale: string, atMs: number): string {
  const part = (style: 'shortOffset' | 'longGeneric') =>
    new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: style })
      .formatToParts(atMs)
      .find((p) => p.type === 'timeZoneName')?.value;
  const offset = part('shortOffset');
  const name = part('longGeneric');
  return [offset, name && name !== offset ? name : null].filter(Boolean).join(' · ');
}

export function CalendarView({ events, initialFilters, serverTimeZone, serverNow, isCurrentWeek, locale, t }: Props) {
  const timeZone = useTimeZone(serverTimeZone);
  const liveNow = useNow();
  const now = liveNow ?? serverNow;
  const [filters, setFilters] = useState(initialFilters);
  const [query, setQuery] = useState('');
  const toolbarRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);

  // Functional update: quick successive clicks each build on the latest state, not a stale closure.
  const update = (change: (prev: CalendarFilters) => CalendarFilters) => setFilters(change);
  const reset = () => {
    setQuery('');
    update(() => defaultFilters());
  };

  // Persist after the user changes something (not on mount — the server already used the cookie).
  const changed = useRef(false);
  useEffect(() => {
    if (changed.current) saveFilters(filters);
    changed.current = true;
  }, [filters]);

  // Expose the sticky toolbar's height so day headings and #today stop below it.
  useEffect(() => {
    const bar = toolbarRef.current;
    const view = viewRef.current;
    if (!bar || !view) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) view.style.setProperty('--toolbar-h', `${Math.round(entry.borderBoxSize[0]?.blockSize ?? 0)}px`);
    });
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      events.filter(
        (e) =>
          // Currencies outside the majors (FF uses e.g. "ALL" for some holidays) are never filtered out.
          (filters.currencies.includes(e.currency) || !(CURRENCIES as readonly string[]).includes(e.currency)) &&
          filters.impacts.includes(e.impact) &&
          (!q || e.title.toLowerCase().includes(q) || e.currency.toLowerCase() === q),
      ),
    [events, filters, q],
  );

  const dayKeyFmt = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const dayFmt = new Intl.DateTimeFormat(locale, { timeZone, weekday: 'long', day: 'numeric', month: 'long' });
  const timeFmt = new Intl.DateTimeFormat(locale, { timeZone, hour: '2-digit', minute: '2-digit' });
  const todayKey = isCurrentWeek ? dayKeyFmt.format(now * 1000) : null;
  // The next actual release — holidays are not releases.
  const nextId = liveNow === null ? null : (visible.find((e) => e.ts > liveNow && e.impact !== 'HOLIDAY')?.id ?? null);

  const days = new Map<string, CalendarEvent[]>();
  for (const e of visible) {
    const key = dayKeyFmt.format(e.ts * 1000);
    days.set(key, [...(days.get(key) ?? []), e]);
  }
  // Keep a "today" group even when filters hide all of today's events, so the Today link lands.
  if (todayKey && !days.has(todayKey) && visible.length) {
    const ordered = [...days, [todayKey, [] as CalendarEvent[]] as const].sort((a, b) => a[0].localeCompare(b[0]));
    days.clear();
    for (const [k, v] of ordered) days.set(k, [...v]);
  }

  const isFiltered = !isDefaultFilters(filters) || q !== '';

  return (
    <div ref={viewRef} className={styles.view}>
      <div ref={toolbarRef} className={styles.toolbar} role="group" aria-label={t.filters.label}>
        <div className={styles.chips}>
          <div className={styles.group} role="group" aria-label={t.filters.currencies}>
            {CURRENCIES.map((c) => (
              <button
                key={c}
                type="button"
                className={styles.chip}
                aria-pressed={filters.currencies.includes(c)}
                onClick={() => update((f) => ({ ...f, currencies: toggle(f.currencies, c, CURRENCIES) }))}
              >
                {c}
              </button>
            ))}
          </div>
          <div className={styles.group} role="group" aria-label={t.filters.impacts}>
            {IMPACTS.map((i) => (
              <button
                key={i}
                type="button"
                className={styles.chip}
                aria-pressed={filters.impacts.includes(i)}
                onClick={() => update((f) => ({ ...f, impacts: toggle<Impact>(f.impacts, i, IMPACTS) }))}
              >
                <span className={`impact impact--${i.toLowerCase()}`}>{t.impact[i]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className={styles.searchRow}>
          <label className={styles.search}>
            <Search size={15} strokeWidth={1.75} aria-hidden />
            <span className={styles.srOnly}>{t.filters.search}</span>
            <input
              type="search"
              value={query}
              placeholder={t.filters.searchPlaceholder}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          {isFiltered && (
            <button type="button" className={styles.reset} onClick={reset}>
              <X size={14} strokeWidth={2} aria-hidden />
              {t.filters.reset}
            </button>
          )}
        </div>
      </div>

      <p className={`${styles.meta} data`} aria-live="polite">
        {t.showing.replace('{n}', String(visible.length)).replace('{total}', String(events.length))} ·{' '}
        {zoneLabel(timeZone, locale, now * 1000)}
      </p>

      {visible.length === 0 ? (
        <div className={styles.empty}>
          <p>{t.noMatch}</p>
          <button type="button" className="button" onClick={reset}>
            {t.filters.reset}
          </button>
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">{t.columns.time}</th>
              <th scope="col">{t.columns.impact}</th>
              <th scope="col">{t.columns.currency}</th>
              <th scope="col">{t.columns.event}</th>
              <th scope="col" className={styles.num}>
                {t.columns.actual}
              </th>
              <th scope="col" className={styles.num}>
                {t.columns.forecast}
              </th>
              <th scope="col" className={styles.num}>
                {t.columns.previous}
              </th>
            </tr>
          </thead>
          {[...days].map(([key, list]) => {
            const isToday = key === todayKey;
            return (
              <tbody key={key} id={isToday ? 'today' : undefined} className={styles.day} data-today={isToday || undefined}>
                <tr className={styles.dayRow}>
                  <th scope="rowgroup" colSpan={7}>
                    {dayFmt.format(list[0] ? list[0].ts * 1000 : now * 1000)}
                    {isToday && <span className={styles.todayTag}>{t.today}</span>}
                  </th>
                </tr>
                {list.length === 0 && (
                  <tr>
                    <td colSpan={7} className={styles.emptyDay}>
                      {t.noMatchToday}
                    </td>
                  </tr>
                )}
                {list.map((e, idx) => {
                  const prev = list[idx - 1];
                  const showNow = liveNow !== null && isToday && e.ts > liveNow && (!prev || prev.ts <= liveNow);
                  const released = liveNow !== null && e.ts <= liveNow;
                  const hasValues = !!(e.actual || e.forecast || e.previous);
                  return (
                    <Fragment key={e.id}>
                      {showNow && (
                        <tr className={styles.nowRow} aria-hidden="true">
                          <td colSpan={7}>
                            <span className="data">{t.now}</span>
                          </td>
                        </tr>
                      )}
                      <tr
                        className={styles.row}
                        data-impact={e.impact}
                        data-released={released || undefined}
                        data-novalues={!hasValues || undefined}
                      >
                        <td className={styles.time}>
                          <time dateTime={new Date(e.ts * 1000).toISOString()}>{timeFmt.format(e.ts * 1000)}</time>
                          {e.id === nextId && liveNow !== null && (
                            <span className={`${styles.countdown} data`}>
                              {t.in} {formatCountdown(e.ts - liveNow)}
                            </span>
                          )}
                        </td>
                        <td className={styles.impactCell}>
                          <span className={`impact impact--${e.impact.toLowerCase()}`}>{t.impact[e.impact]}</span>
                        </td>
                        <td className={styles.ccy}>{e.currency}</td>
                        <td className={styles.event}>
                          {e.title}
                          {e.notice && <span className={styles.notice}>{e.notice}</span>}
                        </td>
                        <td className={styles.num} data-label={t.columns.actual} data-empty={!e.actual || undefined}>
                          <span className={styles.actual}>
                            {e.actual ?? ''}
                            {/* User decision: arrows mean better/worse than forecast; the tooltip says so. */}
                            {e.outcome === 'better' && (
                              <span className={styles.outcome} title={t.better}>
                                <ArrowUp className={styles.better} size={16} strokeWidth={2.25} aria-label={t.better} />
                              </span>
                            )}
                            {e.outcome === 'worse' && (
                              <span className={styles.outcome} title={t.worse}>
                                <ArrowDown className={styles.worse} size={16} strokeWidth={2.25} aria-label={t.worse} />
                              </span>
                            )}
                          </span>
                        </td>
                        <td className={styles.num} data-label={t.columns.forecast} data-empty={!e.forecast || undefined}>
                          {e.forecast ?? ''}
                        </td>
                        <td className={styles.num} data-label={t.columns.previous} data-empty={!e.previous || undefined}>
                          {e.previous ?? ''}
                          {e.revision && (
                            <span className={styles.revision} title={t.revisedTo.replace('{v}', e.revision)}>
                              {' '}
                              ({t.revised} {e.revision})
                            </span>
                          )}
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            );
          })}
        </table>
      )}
    </div>
  );
}

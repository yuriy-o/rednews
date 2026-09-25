'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Search, X } from 'lucide-react';
import type { CalendarEvent, Impact } from '@/lib/api';
import type { Dictionary } from '@/i18n/dictionaries';
import { formatCountdown, useNow, useTimeZone } from '@/lib/use-time';
import { CURRENCIES, FILTER_COOKIE, IMPACTS, allFilters, serializeFilterCookie, type CalendarFilters } from '@/lib/calendar-filters';
import styles from './calendar-view.module.css';

interface Props {
  events: CalendarEvent[];
  initialFilters: CalendarFilters;
  serverTimeZone: string;
  locale: string;
  t: Dictionary['calendar'];
}

function saveFilters(f: CalendarFilters) {
  // One year; path-wide so every locale and week page reads the same choice.
  document.cookie = `${FILTER_COOKIE}=${serializeFilterCookie(f)}; path=/; max-age=31536000; samesite=lax`;
}

function toggle<T>(list: T[], item: T, order: readonly T[]): T[] {
  if (list.includes(item)) return list.length > 1 ? list.filter((x) => x !== item) : list; // keep at least one
  return order.filter((x) => x === item || list.includes(x));
}

export function CalendarView({ events, initialFilters, serverTimeZone, locale, t }: Props) {
  const timeZone = useTimeZone(serverTimeZone);
  const now = useNow();
  const [filters, setFilters] = useState(initialFilters);
  const [query, setQuery] = useState('');

  // Functional update: quick successive clicks each build on the latest state, not a stale closure.
  const update = (change: (prev: CalendarFilters) => CalendarFilters) => setFilters(change);

  // Persist after the user changes something (not on mount — the server already used the cookie).
  const changed = useRef(false);
  useEffect(() => {
    if (changed.current) saveFilters(filters);
    changed.current = true;
  }, [filters]);

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
  const todayKey = now === null ? null : dayKeyFmt.format(now * 1000);
  const nextId = now === null ? null : visible.find((e) => e.ts > now)?.id ?? null;

  const days = new Map<string, CalendarEvent[]>();
  for (const e of visible) {
    const key = dayKeyFmt.format(e.ts * 1000);
    days.set(key, [...(days.get(key) ?? []), e]);
  }

  const isFiltered =
    filters.currencies.length !== CURRENCIES.length || filters.impacts.length !== IMPACTS.length || q !== '';

  return (
    <div className={styles.view}>
      <div className={styles.toolbar} role="group" aria-label={t.filters.label}>
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
          <button
            type="button"
            className={styles.reset}
            onClick={() => {
              setQuery('');
              update(() => allFilters());
            }}
          >
            <X size={14} strokeWidth={2} aria-hidden />
            {t.filters.reset}
          </button>
        )}
      </div>

      <p className={`${styles.meta} data`} aria-live="polite">
        {t.showing.replace('{n}', String(visible.length)).replace('{total}', String(events.length))} · {timeZone}
      </p>

      {visible.length === 0 ? (
        <div className={styles.empty}>
          <p>{t.noMatch}</p>
          <button
            type="button"
            className="button"
            onClick={() => {
              setQuery('');
              update(() => allFilters());
            }}
          >
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
                    {dayFmt.format(list[0]!.ts * 1000)}
                    {isToday && <span className={styles.todayTag}>{t.today}</span>}
                  </th>
                </tr>
                {list.map((e, idx) => {
                  const prev = list[idx - 1];
                  const showNow = now !== null && e.ts > now && (!prev || prev.ts <= now) && isToday;
                  const released = now !== null && e.ts <= now;
                  return (
                    <Fragment key={e.id}>
                      {showNow && (
                        <tr className={styles.nowRow} aria-hidden="true">
                          <td colSpan={7}>
                            <span className="data">{t.now}</span>
                          </td>
                        </tr>
                      )}
                      <tr className={styles.row} data-released={released || undefined}>
                        <td className={styles.time}>
                          <time dateTime={new Date(e.ts * 1000).toISOString()}>{timeFmt.format(e.ts * 1000)}</time>
                          {e.id === nextId && now !== null && (
                            <span className={`${styles.countdown} data`}>
                              {t.in} {formatCountdown(e.ts - now)}
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
                            {e.outcome === 'better' && <ArrowUp className={styles.better} size={13} aria-label={t.better} />}
                            {e.outcome === 'worse' && <ArrowDown className={styles.worse} size={13} aria-label={t.worse} />}
                          </span>
                        </td>
                        <td className={styles.num} data-label={t.columns.forecast}>
                          {e.forecast ?? ''}
                        </td>
                        <td className={styles.num} data-label={t.columns.previous}>
                          {e.previous ?? ''}
                          {e.revision && <span className={styles.revision}> ({e.revision})</span>}
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

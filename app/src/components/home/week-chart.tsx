'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { CalendarEvent } from '@/lib/api';
import type { Dictionary } from '@/i18n/dictionaries';
import { formatCountdown, useNow, useTimeZone } from '@/lib/use-time';
import styles from './week-chart.module.css';

export interface NewsLine {
  ts: number;
  events: CalendarEvent[];
}

interface Props {
  lines: NewsLine[];
  domain: [number, number];
  path: [number, number][];
  locale: string;
  t: Dictionary['home']['chart'];
}

const SNAP_PX = 18;
const FLAG_PX = 168; // flag width budget used to stack colliding flags
const FLAG_PX_COMPACT = 60;
const MAX_LEVELS = 3;

export function WeekChart({ lines, domain, path, locale, t }: Props) {
  const timeZone = useTimeZone();
  const now = useNow();
  const plotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1152);
  const [hoverX, setHoverX] = useState<number | null>(null); // fraction 0–1
  const [active, setActive] = useState<number | null>(null); // index into lines
  const cardId = useId();
  const clipId = `past${cardId.replace(/[^\w-]/g, '')}`; // useId output isn't safe inside url(#…)

  const [from, to] = domain;
  const xOf = (ts: number) => (ts - from) / (to - from);

  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const ro = new ResizeObserver(
      ([entry]) => entry && setWidth(entry.contentRect.width)
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Stack flags that would overlap at the current width; beyond MAX_LEVELS they share the last row.
  const levels = useMemo(() => {
    const lastRight: number[] = [];
    const flagPx = width <= 640 ? FLAG_PX_COMPACT : FLAG_PX; // titles are hidden on narrow screens
    return lines.map(l => {
      const x = xOf(l.ts) * width;
      let level = lastRight.findIndex(right => right < x - 6);
      if (level === -1) level = Math.min(lastRight.length, MAX_LEVELS - 1);
      lastRight[level] = x + flagPx;
      return level;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, width, from, to]);

  // Weekday then day ("Mon 21") in every locale, like a chart's time scale.
  const weekdayFmt = new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'short',
  });
  const dayNumFmt = new Intl.DateTimeFormat(locale, {
    timeZone,
    day: 'numeric',
  });
  const dayLabel = (ms: number) =>
    `${weekdayFmt.format(ms)} ${dayNumFmt.format(ms)}`;
  const timeFmt = new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  // Local midnights inside the domain → day gridlines and labels. Step whole hours from an
  // hour boundary (the domain edges are fractional) and read the hour as a number: engines
  // format midnight as "0", "00" or "24" depending on locale and hour cycle.
  const days = useMemo(() => {
    const hourFmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hourCycle: 'h23',
    });
    const out: number[] = [];
    for (let ts = Math.ceil(from / 3600) * 3600; ts <= to; ts += 3600) {
      if (Number(hourFmt.format(ts * 1000)) % 24 === 0) out.push(ts);
    }
    return out;
  }, [from, to, timeZone]);

  const d = path
    .map(
      ([x, y], i) =>
        `${i ? 'L' : 'M'}${(x * 1000).toFixed(1)} ${(y * 100).toFixed(2)}`
    )
    .join(' ');

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let nearest: number | null = null;
    let best = SNAP_PX;
    lines.forEach((l, i) => {
      const dist = Math.abs(xOf(l.ts) * rect.width - px);
      if (dist < best) {
        best = dist;
        nearest = i;
      }
    });
    setActive(nearest);
    setHoverX(nearest === null ? px / rect.width : xOf(lines[nearest]!.ts));
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') setActive(null);
  }

  const activeLine = active === null ? null : lines[active];
  const crosshairX = hoverX ?? (activeLine ? xOf(activeLine.ts) : null);
  const crosshairTs =
    crosshairX === null ? null : from + crosshairX * (to - from);
  const nowX = now === null ? null : xOf(now);

  return (
    // Time runs left to right on charts in every locale, including RTL ones.
    <figure className={styles.chart} onKeyDown={onKeyDown} dir="ltr">
      <div
        ref={plotRef}
        className={styles.plot}
        onPointerMove={onPointerMove}
        onPointerLeave={() => {
          setHoverX(null);
          setActive(null);
        }}
      >
        <svg
          className={styles.svg}
          viewBox="0 0 1000 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {[20, 40, 60, 80].map(y => (
            <line
              key={y}
              x1="0"
              x2="1000"
              y1={y}
              y2={y}
              className={styles.grid}
            />
          ))}
          {days.map(ts => (
            <line
              key={ts}
              x1={xOf(ts) * 1000}
              x2={xOf(ts) * 1000}
              y1="0"
              y2="100"
              className={styles.grid}
            />
          ))}
          {/* No price exists after "now": the path stops there once the client knows the time. */}
          <clipPath id={clipId}>
            <rect
              x="0"
              y="0"
              width={
                nowX === null ? 1000 : Math.max(0, Math.min(1, nowX)) * 1000
              }
              height="100"
            />
          </clipPath>
          <path d={d} className={styles.price} clipPath={`url(#${clipId})`} />
        </svg>

        {nowX !== null && nowX > 0 && nowX < 1 && (
          <div
            className={styles.now}
            style={{ insetInlineStart: `${nowX * 100}%` }}
          >
            <span className="data">{t.now}</span>
          </div>
        )}

        {lines.map((l, i) => {
          const x = xOf(l.ts);
          const first = l.events[0]!;
          const past = now !== null && l.ts <= now;
          return (
            <div
              key={l.ts}
              className={styles.news}
              data-active={active === i || undefined}
              data-past={past || undefined}
              style={{ insetInlineStart: `${x * 100}%` }}
            >
              <button
                type="button"
                className={styles.flag}
                style={{ insetBlockStart: `${8 + levels[i]! * 30}px` }}
                // Starts with exactly the visible text (WCAG 2.5.3 Label in Name, so voice control
                // matches), then names every release — narrow screens show only the currency.
                // "+N" sits right after the currency, so the visible text is a prefix of this
                // name whether or not the title is shown.
                aria-label={[
                  `${first.currency}${l.events.length > 1 ? ` +${l.events.length - 1}` : ''} ${first.title}`,
                  ...l.events.slice(1).map(e => `${e.currency} ${e.title}`),
                ].join(', ')}
                aria-describedby={active === i ? cardId : undefined}
                onFocus={() => {
                  setActive(i);
                  setHoverX(null);
                }}
                onBlur={() => setActive(cur => (cur === i ? null : cur))}
                onClick={() => setActive(i)}
              >
                <span className={styles.ccy}>{first.currency}</span>
                {l.events.length > 1 && (
                  <>
                    {' '}
                    <span className={styles.more}>+{l.events.length - 1}</span>
                  </>
                )}{' '}
                <span className={styles.title}>{first.title}</span>
              </button>
            </div>
          );
        })}

        {crosshairX !== null && (
          <div
            className={styles.crosshair}
            style={{ insetInlineStart: `${crosshairX * 100}%` }}
            aria-hidden="true"
          >
            {crosshairTs !== null && (
              <span className={`${styles.axisTag} data`}>
                {timeFmt.format(crosshairTs * 1000)}
              </span>
            )}
          </div>
        )}

        {activeLine && (
          <div
            id={cardId}
            role="tooltip"
            className={styles.card}
            data-flip={xOf(activeLine.ts) > 0.62 || undefined}
            style={{ insetInlineStart: `${xOf(activeLine.ts) * 100}%` }}
          >
            <p className={`${styles.cardTime} data`}>
              {timeFmt.format(activeLine.ts * 1000)}
              {now !== null && activeLine.ts > now && (
                <span>
                  {' '}
                  · {t.in} {formatCountdown(activeLine.ts - now)}
                </span>
              )}
            </p>
            {activeLine.events.map(e => (
              <div key={e.id} className={styles.cardEvent}>
                <p className={styles.cardTitle}>
                  <span className={styles.ccy}>{e.currency}</span> {e.title}
                </p>
                {/* Speeches and press conferences have no numbers — skip the empty grid. */}
                {(e.actual || e.forecast || e.previous) && (
                  <dl className={`${styles.values} data`}>
                    <div>
                      <dt>{t.actual}</dt>
                      <dd>
                        {e.actual ?? '—'}
                        {e.outcome === 'better' && (
                          <ArrowUp
                            className={styles.better}
                            size={13}
                            aria-label={t.better}
                          />
                        )}
                        {e.outcome === 'worse' && (
                          <ArrowDown
                            className={styles.worse}
                            size={13}
                            aria-label={t.worse}
                          />
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>{t.forecast}</dt>
                      <dd>{e.forecast ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>{t.previous}</dt>
                      <dd>{e.previous ?? '—'}</dd>
                    </div>
                  </dl>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`${styles.axis} data`} aria-hidden="true">
        {days
          .map(ts => ({ ts, x: xOf(ts + 43200) }))
          .filter(({ x }) => x > 0.03 && x < 0.97)
          // ~64px per label: thin out to every other day when they would touch.
          .filter((_, i, all) => all.length * 64 <= width || i % 2 === 0)
          .map(({ ts, x }) => (
            <span key={ts} style={{ insetInlineStart: `${x * 100}%` }}>
              {dayLabel(ts * 1000)}
            </span>
          ))}
      </div>

      <figcaption className={styles.caption}>
        <span className={styles.legend} aria-hidden="true" />
        {t.caption}
      </figcaption>
    </figure>
  );
}

// ForexFactory weeks run Sunday–Saturday in US Eastern time and are named by their Sunday
// ('YYYY-MM-DD'). The free window mirrors server/src/calendar/calendar.service.ts — keep in sync.

const FF_TZ = 'America/New_York';
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WINDOW_DAYS = { past: 21, future: 30 };

export function addDays(ds: string, n: number): string {
  const d = new Date(`${ds}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Sunday (US Eastern) of the FF week containing tsSec. */
export function weekStartOf(tsSec: number): string {
  const ms = tsSec * 1000;
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: FF_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms);
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: FF_TZ, weekday: 'short' }).format(ms);
  return addDays(day, -Math.max(0, WEEKDAYS.indexOf(wd)));
}

/** Sunday of the current FF week. Request-time on the server (calendar pages render per request). */
export function currentWeekStart(): string {
  return weekStartOf(Math.floor(Date.now() / 1000));
}

export function isWeekStart(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T00:00:00Z`).getUTCDay() === 0;
}

export function isWeekInWindow(weekStart: string, nowMs: number): boolean {
  const start = Date.parse(`${weekStart}T00:00:00Z`);
  const end = start + 7 * 86400_000;
  return end > nowMs - WINDOW_DAYS.past * 86400_000 && start < nowMs + WINDOW_DAYS.future * 86400_000;
}

/** "Sep 20 – 26, 2026" / "Sep 27 – Oct 3, 2026" in the given locale (dates are calendar days, UTC). */
export function formatWeekRange(weekStart: string, locale: string): string {
  const fmt = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
  return fmt.formatRange(new Date(`${weekStart}T00:00:00Z`), new Date(`${addDays(weekStart, 6)}T00:00:00Z`));
}

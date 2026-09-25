// Typed client for the Red News API (NestJS, `server/`). Shapes mirror CalendarEventDto there.

export const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'https://rednews-g6ly.onrender.com/api/v1').replace(/\/$/, '');

export type Impact = 'HIGH' | 'MEDIUM' | 'LOW' | 'HOLIDAY';

export interface CalendarEvent {
  id: string;
  ts: number; // unix seconds (UTC)
  currency: string;
  title: string;
  impact: Impact;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  revision: string | null;
  /** Actual vs forecast; null until the actual is released. */
  outcome: 'better' | 'worse' | 'neutral' | null;
  notice: string | null;
  ebaseId: number | null;
  url: string | null;
}

export interface EventsResponse {
  count: number;
  events: CalendarEvent[];
}

export interface EventFilters {
  impacts?: Impact[];
  currencies?: string[];
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// Calendar data is cached upstream per FF week; 5 minutes here keeps pages fast without going stale.
const CALENDAR_REVALIDATE_S = 300;

async function get<T>(path: string, params: Record<string, string | undefined> = {}, revalidate = CALENDAR_REVALIDATE_S): Promise<T> {
  const qs = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1])).toString();
  const res = await fetch(`${apiUrl}${path}${qs ? `?${qs}` : ''}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate },
    // Render's free tier cold-starts in up to ~50 s; don't hang a page render longer than that.
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new ApiError(res.status, `${path} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

const filterParams = (f: EventFilters = {}) => ({
  impacts: f.impacts?.join(','),
  currencies: f.currencies?.join(','),
});

export const calendarApi = {
  week: (f?: EventFilters) => get<EventsResponse>('/calendar/week', filterParams(f)),
  upcoming: (f?: EventFilters) => get<EventsResponse>('/calendar/upcoming', filterParams(f)),
  recent: (f?: EventFilters) => get<EventsResponse>('/calendar/recent', filterParams(f)),
  range: (from: number, to: number, f?: EventFilters) =>
    get<EventsResponse & { from: number; to: number }>('/calendar/events', {
      from: String(from),
      to: String(to),
      ...filterParams(f),
    }),
};

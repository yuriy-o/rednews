import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { CalendarEvent, Impact } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { FF_BASE, FF_FEED_URL, ffGet } from './forexfactory.client';
import { FfEvent, ffDate, parseCalendarHtml, parseFeed } from './forexfactory.parser';

// ForexFactory is fetched one FF week (Sun–Sat, US Eastern) at a time. Each week is cached
// in CacheEntry, so every visitor shares one upstream request per TTL, and parsed events are
// stored in CalendarEvent so the API keeps serving (stale) data while FF is unreachable.

const FF_TZ = 'America/New_York';
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MIN = 60 * 1000;
const TTL = {
  current: 15 * MIN, // actuals land during the week
  future: 60 * MIN,
  past: 24 * 60 * MIN, // settled; revisions are rare
  feedFallback: 5 * MIN, // retry the richer HTML source soon
};
export const MAX_RANGE_DAYS = 35;

// Same free window as the extension (21 days back, 30 ahead). A week is in the window when any
// of its days is — so the edge weeks are whole. Beyond it: Premium, once accounts exist.
export const WINDOW_DAYS = { past: 21, future: 30 };

function isWeekInWindow(weekStart: string): boolean {
  const start = Date.parse(`${weekStart}T00:00:00Z`);
  const end = start + 7 * 86400_000;
  const now = Date.now();
  return end > now - WINDOW_DAYS.past * 86400_000 && start < now + WINDOW_DAYS.future * 86400_000;
}

export interface EventFilters {
  impacts?: Impact[];
  currencies?: string[];
}

export interface CalendarEventDto {
  id: string;
  ts: number;
  currency: string;
  title: string;
  impact: Impact;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  revision: string | null;
  /** Actual vs forecast, from the trader's point of view for this currency. */
  outcome: Outcome | null;
  notice: string | null;
  ebaseId: number | null;
  url: string | null;
}

function nyDate(tsSec: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FF_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(tsSec * 1000),
  );
}

function addDays(ds: string, n: number): string {
  const d = new Date(`${ds}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Sunday (US Eastern) of the FF week containing tsSec, as 'YYYY-MM-DD'. */
function weekStartOf(tsSec: number): string {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: FF_TZ, weekday: 'short' }).format(new Date(tsSec * 1000));
  return addDays(nyDate(tsSec), -Math.max(0, WEEKDAYS.indexOf(wd)));
}

export type Outcome = 'better' | 'worse' | 'neutral';

// ForexFactory's actualBetterWorse code: 1 = better, 2 = worse, 0 = in line with forecast.
function toOutcome(code: number | null): Outcome | null {
  if (code === 1) return 'better';
  if (code === 2) return 'worse';
  if (code === 0) return 'neutral';
  return null;
}

function toDto(e: CalendarEvent): CalendarEventDto {
  return {
    id: e.externalId,
    ts: e.timestamp,
    currency: e.country,
    title: e.title,
    impact: e.impact,
    actual: e.actual,
    forecast: e.forecast,
    previous: e.previous,
    revision: e.revision,
    outcome: e.actual ? toOutcome(e.actualBetterWorse) : null,
    notice: e.notice,
    ebaseId: e.ebaseId,
    url: e.soloUrl ? `${FF_BASE}${e.soloUrl}` : null,
  };
}

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);
  private readonly inflight = new Map<string, Promise<void>>();

  constructor(private prisma: PrismaService) {}

  async getEvents(from: number, to: number, filters: EventFilters = {}): Promise<CalendarEventDto[]> {
    if (!Number.isInteger(from) || !Number.isInteger(to) || from <= 0 || to <= 0) {
      throw new BadRequestException('from and to must be unix timestamps in seconds');
    }
    if (to < from) throw new BadRequestException('to must be after from');
    if (to - from > MAX_RANGE_DAYS * 86400) {
      throw new BadRequestException(`range must not exceed ${MAX_RANGE_DAYS} days`);
    }

    // Sequential on purpose: be gentle with FF when a range spans several uncached weeks.
    // Weeks outside the fetch window are served from the database only, so nobody (crawlers
    // included) can make this server scrape arbitrary history from ForexFactory.
    for (let ws = weekStartOf(from); ws <= weekStartOf(to); ws = addDays(ws, 7)) {
      if (isWeekInWindow(ws)) await this.ensureWeek(ws);
    }

    const rows = await this.prisma.calendarEvent.findMany({
      where: {
        timestamp: { gte: from, lte: to },
        ...(filters.impacts?.length ? { impact: { in: filters.impacts } } : {}),
        ...(filters.currencies?.length ? { country: { in: filters.currencies } } : {}),
      },
      orderBy: { timestamp: 'asc' },
    });
    return rows.map(toDto);
  }

  getUpcoming(filters?: EventFilters) {
    const now = Math.floor(Date.now() / 1000);
    return this.getEvents(now, now + 7 * 86400, filters);
  }

  getRecent(filters?: EventFilters) {
    const now = Math.floor(Date.now() / 1000);
    return this.getEvents(now - 7 * 86400, now, filters);
  }

  /** The current FF week, Sunday through Saturday. */
  getCurrentWeek(filters?: EventFilters) {
    return this.getWeek(weekStartOf(Math.floor(Date.now() / 1000)), filters);
  }

  /** One FF week by its Sunday ('YYYY-MM-DD', US Eastern). Only weeks inside the free window. */
  async getWeek(weekStart: string, filters?: EventFilters): Promise<CalendarEventDto[]> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || new Date(`${weekStart}T00:00:00Z`).getUTCDay() !== 0) {
      throw new BadRequestException('start must be a Sunday as YYYY-MM-DD');
    }
    if (!isWeekInWindow(weekStart)) {
      throw new ForbiddenException({ error: 'premium_required', window: WINDOW_DAYS });
    }
    const from = Math.floor(Date.parse(`${weekStart}T00:00:00Z`) / 1000) - 12 * 3600; // cover US Eastern offset
    const events = await this.getEvents(from, from + 8 * 86400, filters);
    return events.filter((e) => weekStartOf(e.ts) === weekStart);
  }

  /** Refreshes a week if its cache expired. Never throws: on failure the stored data is served. */
  private ensureWeek(weekStart: string): Promise<void> {
    const running = this.inflight.get(weekStart);
    if (running) return running;
    const task = this.refreshWeek(weekStart)
      .catch((e: Error) => this.logger.warn(`FF week ${weekStart} not refreshed: ${e.message}`))
      .finally(() => this.inflight.delete(weekStart));
    this.inflight.set(weekStart, task);
    return task;
  }

  private async refreshWeek(weekStart: string): Promise<void> {
    const key = `ff:week:${weekStart}`;
    const cached = await this.prisma.cacheEntry.findUnique({ where: { key } });
    if (cached && cached.expiresAt > new Date()) return;

    const currentWeek = weekStartOf(Math.floor(Date.now() / 1000));
    const ttl = weekStart === currentWeek ? TTL.current : weekStart > currentWeek ? TTL.future : TTL.past;
    const url = `${FF_BASE}/calendar?range=${ffDate(weekStart)}-${ffDate(addDays(weekStart, 6))}`;

    try {
      const { events, unknown } = parseCalendarHtml(await ffGet(url, 'text/html'));
      if (!events.length) throw new Error('calendar page contained no events');
      await this.store(events, 'ff-html');
      // HTML rows supersede any feed-fallback rows stored for this week.
      await this.prisma.calendarEvent.deleteMany({
        where: { sourceApi: 'ff-feed', timestamp: { gte: events[0]!.ts - 86400, lte: events[events.length - 1]!.ts + 86400 } },
      });
      await this.setCache(key, { source: 'html', count: events.length, unknown }, ttl);
    } catch (htmlError) {
      // Only the current week exists in the CDN feed.
      if (weekStart !== currentWeek) throw htmlError;
      const { events, unknown } = parseFeed(JSON.parse(await ffGet(FF_FEED_URL, 'application/json')));
      // Stale HTML rows (with actuals) beat fresh feed rows; mixing both would duplicate events.
      const htmlRows = events.length
        ? await this.prisma.calendarEvent.count({
            where: { sourceApi: 'ff-html', timestamp: { gte: events[0]!.ts, lte: events[events.length - 1]!.ts } },
          })
        : 0;
      if (!htmlRows) await this.store(events, 'ff-feed');
      await this.setCache(key, { source: 'feed', count: events.length, unknown }, TTL.feedFallback);
      this.logger.warn(`FF week ${weekStart} served from feed fallback: ${(htmlError as Error).message}`);
    }
  }

  private async store(events: FfEvent[], sourceApi: string): Promise<void> {
    const fetchedAt = new Date();
    await this.prisma.$transaction(
      events.map((e) => {
        const data = {
          timestamp: e.ts,
          country: e.currency,
          title: e.title,
          impact: e.impact,
          actual: e.actual,
          forecast: e.forecast,
          previous: e.previous,
          revision: e.revision,
          ebaseId: e.ebaseId,
          actualBetterWorse: e.actualBetterWorse,
          notice: e.notice,
          soloUrl: e.soloUrl,
          sourceApi,
          fetchedAt,
        };
        return this.prisma.calendarEvent.upsert({
          where: { externalId: e.externalId },
          create: { externalId: e.externalId, ...data },
          update: data,
        });
      }),
    );
  }

  private async setCache(key: string, value: object, ttlMs: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlMs);
    await this.prisma.cacheEntry.upsert({
      where: { key },
      create: { key, value, expiresAt },
      update: { value, expiresAt },
    });
  }
}

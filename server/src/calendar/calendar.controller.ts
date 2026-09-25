import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { Impact } from '@prisma/client';
import { CalendarEventDto, CalendarService, EventFilters } from './calendar.service';

const IMPACTS = new Set<string>(Object.values(Impact));

function parseFilters(impacts?: string, currencies?: string): EventFilters {
  const filters: EventFilters = {};
  if (impacts) {
    const list = impacts.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    const bad = list.filter((i) => !IMPACTS.has(i));
    if (bad.length) {
      throw new BadRequestException(`unknown impact: ${bad.join(', ')} (allowed: ${[...IMPACTS].join(', ')})`);
    }
    filters.impacts = list as Impact[];
  }
  if (currencies) {
    filters.currencies = currencies.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  }
  return filters;
}

const respond = (events: CalendarEventDto[], extra: object = {}) => ({ count: events.length, ...extra, events });

@Controller('calendar')
export class CalendarController {
  constructor(private calendarService: CalendarService) {}

  /** GET /api/v1/calendar/events?from=&to=  (unix seconds, max 35 days) */
  @Get('events')
  async getEvents(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('impacts') impacts?: string,
    @Query('currencies') currencies?: string,
  ) {
    const fromTs = Number(from);
    const toTs = Number(to);
    const events = await this.calendarService.getEvents(fromTs, toTs, parseFilters(impacts, currencies));
    return respond(events, { from: fromTs, to: toTs });
  }

  /**
   * GET /api/v1/calendar/week[?start=YYYY-MM-DD] — a ForexFactory week (Sun–Sat, US Eastern);
   * the current one without `start`. 403 premium_required outside the free window.
   */
  @Get('week')
  async getWeek(
    @Query('start') start?: string,
    @Query('impacts') impacts?: string,
    @Query('currencies') currencies?: string,
  ) {
    const filters = parseFilters(impacts, currencies);
    const events = start
      ? await this.calendarService.getWeek(start, filters)
      : await this.calendarService.getCurrentWeek(filters);
    return respond(events);
  }

  /** GET /api/v1/calendar/upcoming — next 7 days */
  @Get('upcoming')
  async getUpcoming(@Query('impacts') impacts?: string, @Query('currencies') currencies?: string) {
    return respond(await this.calendarService.getUpcoming(parseFilters(impacts, currencies)));
  }

  /** GET /api/v1/calendar/recent — last 7 days */
  @Get('recent')
  async getRecent(@Query('impacts') impacts?: string, @Query('currencies') currencies?: string) {
    return respond(await this.calendarService.getRecent(parseFilters(impacts, currencies)));
  }
}

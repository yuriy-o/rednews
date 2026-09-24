import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('calendar')
export class CalendarController {
  constructor(private calendarService: CalendarService) {}

  /**
   * GET /api/v1/calendar/events
   * Get calendar events for a date range
   */
  @Get('events')
  async getEvents(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('impacts') impacts?: string,
    @Query('countries') countries?: string,
  ) {
    const fromTs = parseInt(from, 10);
    const toTs = parseInt(to, 10);

    if (!fromTs || !toTs) {
      throw new Error('Invalid date range');
    }

    const filters = {
      impacts: impacts ? impacts.split(',') : undefined,
      countries: countries ? countries.split(',') : undefined,
    };

    const events = await this.calendarService.getEvents(fromTs, toTs, filters);

    return {
      count: events.length,
      events,
      from: fromTs,
      to: toTs,
    };
  }

  /**
   * GET /api/v1/calendar/upcoming
   * Get upcoming events (next 7 days)
   */
  @Get('upcoming')
  async getUpcoming(
    @Query('impacts') impacts?: string,
    @Query('countries') countries?: string,
  ) {
    const filters = {
      impacts: impacts ? impacts.split(',') : undefined,
      countries: countries ? countries.split(',') : undefined,
    };

    const events = await this.calendarService.getUpcomingEvents(filters);

    return {
      count: events.length,
      events,
    };
  }

  /**
   * GET /api/v1/calendar/recent
   * Get recent events (last 7 days)
   */
  @Get('recent')
  async getRecent(
    @Query('impacts') impacts?: string,
    @Query('countries') countries?: string,
  ) {
    const filters = {
      impacts: impacts ? impacts.split(',') : undefined,
      countries: countries ? countries.split(',') : undefined,
    };

    const events = await this.calendarService.getRecentEvents(filters);

    return {
      count: events.length,
      events,
    };
  }

  /**
   * POST /api/v1/calendar/sync
   * Sync calendar with Trading Economics (admin only)
   */
  @UseGuards(JwtAuthGuard)
  @Get('sync')
  async syncCalendar() {
    const result = await this.calendarService.syncCalendar();

    return {
      message: 'Calendar synced',
      eventsCount: result.length,
      lastSync: new Date().toISOString(),
    };
  }
}

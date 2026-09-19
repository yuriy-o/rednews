import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class CalendarService {
  private readonly TRADING_ECONOMICS_API = 'https://api.tradingeconomics.com/calendar';
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(private prisma: PrismaService) {}

  /**
   * Fetch calendar events from Trading Economics API
   */
  async fetchCalendarEvents(from: number, to: number) {
    try {
      // Check cache first
      const cacheKey = `calendar:${from}:${to}`;
      const cached = await this.prisma.cacheEntry.findUnique({
        where: { key: cacheKey },
      });

      if (cached && new Date(cached.expiresAt) > new Date()) {
        return cached.value as any[];
      }

      // Fetch from Trading Economics
      const response = await axios.get(this.TRADING_ECONOMICS_API, {
        params: {
          date: this.formatDateRange(from, to),
          token: process.env.TRADING_ECONOMICS_TOKEN,
        },
      });

      // Parse and save events
      const events = response.data.map((evt: any) => ({
        externalId: evt.EventID,
        timestamp: Math.floor(new Date(evt.Date).getTime() / 1000),
        country: evt.Country,
        title: evt.Event,
        impact: this.mapImpact(evt.Importance),
        forecast: evt.Forecast,
        previous: evt.Previous,
        actual: evt.Actual,
        sourceApi: 'trading-economics',
      }));

      // Save to database (upsert)
      for (const event of events) {
        await this.prisma.calendarEvent.upsert({
          where: {
            externalId_revisionId: {
              externalId: event.externalId,
              revisionId: 1,
            },
          },
          create: event,
          update: {
            ...event,
            fetchedAt: new Date(),
          },
        });
      }

      // Cache the result
      const expiresAt = new Date(Date.now() + this.CACHE_TTL * 1000);
      await this.prisma.cacheEntry.upsert({
        where: { key: cacheKey },
        create: {
          key: cacheKey,
          value: events,
          expiresAt,
        },
        update: {
          value: events,
          expiresAt,
        },
      });

      return events;
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
      throw error;
    }
  }

  /**
   * Get events for a specific date range with filtering
   */
  async getEvents(
    from: number,
    to: number,
    filters?: {
      impacts?: string[];
      countries?: string[];
    },
  ) {
    let query = {
      where: {
        timestamp: {
          gte: from,
          lte: to,
        },
      },
    } as any;

    if (filters?.impacts) {
      query.where.impact = { in: filters.impacts };
    }

    if (filters?.countries) {
      query.where.country = { in: filters.countries };
    }

    return this.prisma.calendarEvent.findMany({
      ...query,
      orderBy: { timestamp: 'asc' },
    });
  }

  /**
   * Get upcoming events (next 7 days)
   */
  async getUpcomingEvents(filters?: { impacts?: string[]; countries?: string[] }) {
    const now = Math.floor(Date.now() / 1000);
    const in7Days = now + 7 * 86400;

    return this.getEvents(now, in7Days, filters);
  }

  /**
   * Get recent events (last 7 days)
   */
  async getRecentEvents(filters?: { impacts?: string[]; countries?: string[] }) {
    const now = Math.floor(Date.now() / 1000);
    const last7Days = now - 7 * 86400;

    return this.getEvents(last7Days, now, filters);
  }

  /**
   * Map importance level to impact enum
   */
  private mapImpact(importance: number): string {
    if (importance >= 3) return 'HIGH';
    if (importance === 2) return 'MEDIUM';
    if (importance === 1) return 'LOW';
    return 'HOLIDAY';
  }

  /**
   * Format date range for API
   */
  private formatDateRange(from: number, to: number): string {
    const fromDate = new Date(from * 1000).toISOString().split('T')[0];
    const toDate = new Date(to * 1000).toISOString().split('T')[0];
    return `${fromDate},${toDate}`;
  }

  /**
   * Sync calendar with Trading Economics API
   */
  async syncCalendar() {
    const now = Math.floor(Date.now() / 1000);
    const from = now - 30 * 86400; // 30 days ago
    const to = now + 30 * 86400; // 30 days ahead

    return this.fetchCalendarEvents(from, to);
  }
}

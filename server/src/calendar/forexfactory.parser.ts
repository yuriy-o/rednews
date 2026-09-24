import { Impact } from '@prisma/client';

// Pure ForexFactory parsing — ported from the extension's Supabase /calendar function.

export interface FfEvent {
  externalId: string;
  ts: number; // unix seconds
  currency: string;
  title: string;
  impact: Impact;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  revision: string | null;
  ebaseId: number | null;
  actualBetterWorse: number | null;
  notice: string | null;
  soloUrl: string | null;
}

export interface ParseResult {
  events: FfEvent[];
  unknown: number; // events skipped because their impact is not one we model (e.g. non-economic)
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export function normalizeImpact(raw: unknown): Impact | null {
  const s = String(raw ?? '').toLowerCase();
  if (!s) return null;
  if (s.includes('holiday')) return Impact.HOLIDAY;
  if (s.includes('high')) return Impact.HIGH;
  if (s.includes('medium') || s.includes('moderate')) return Impact.MEDIUM;
  if (s.includes('low')) return Impact.LOW;
  return null;
}

/** 'YYYY-MM-DD' → FF URL date token, e.g. 'sep20.2026'. */
export function ffDate(d: string): string {
  const [y, m, day] = d.split('-').map(Number);
  return `${MONTHS[(m ?? 1) - 1]}${day}.${y}`;
}

const blank = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s ? s : null;
};

/** Extracts every `"events":[...]` array embedded in the FF calendar page (calendarComponentStates). */
export function parseCalendarHtml(html: string): ParseResult {
  const marker = '"events":[';
  const seen = new Set<string>();
  const events: FfEvent[] = [];
  let unknown = 0;
  let idx = 0;

  while ((idx = html.indexOf(marker, idx)) !== -1) {
    const start = idx + marker.length - 1; // the '['
    let depth = 0;
    let inStr = false;
    let esc = false;
    let end = -1;
    for (let i = start; i < html.length; i++) {
      const ch = html[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') inStr = false;
      } else if (ch === '"') inStr = true;
      else if (ch === '[') depth++;
      else if (ch === ']') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) break;
    idx = end + 1;

    let arr: unknown;
    try {
      arr = JSON.parse(html.slice(start, end + 1));
    } catch {
      continue;
    }
    if (!Array.isArray(arr)) continue;

    for (const e of arr as Record<string, unknown>[]) {
      if (!e || typeof e.dateline !== 'number' || !e.currency) continue;
      const externalId = e.id != null ? String(e.id) : `${e.dateline}|${e.currency}|${e.name}`;
      if (seen.has(externalId)) continue;
      seen.add(externalId);

      const impact = normalizeImpact(e.impactName);
      if (!impact) {
        unknown++;
        continue;
      }
      events.push({
        externalId,
        ts: e.dateline,
        currency: String(e.currency),
        title: String(e.name ?? ''),
        impact,
        actual: blank(e.actual),
        forecast: blank(e.forecast),
        previous: blank(e.previous),
        revision: blank(e.revision),
        ebaseId: typeof e.ebaseId === 'number' ? e.ebaseId : null,
        actualBetterWorse: typeof e.actualBetterWorse === 'number' ? e.actualBetterWorse : null,
        notice: blank(e.notice),
        soloUrl: blank(e.soloUrl),
      });
    }
  }

  return { events: events.sort((a, b) => a.ts - b.ts), unknown };
}

/** The CDN this-week feed. It has no ids and no actuals, so externalId is synthetic. */
export function parseFeed(raw: unknown): ParseResult {
  const events: FfEvent[] = [];
  let unknown = 0;
  if (!Array.isArray(raw)) return { events, unknown };

  for (const e of raw as Record<string, unknown>[]) {
    const ts = Math.floor(Date.parse(String(e?.date)) / 1000);
    if (Number.isNaN(ts)) continue;
    const impact = normalizeImpact(e.impact);
    if (!impact) {
      unknown++;
      continue;
    }
    const currency = String(e.country ?? '');
    const title = String(e.title ?? '');
    events.push({
      externalId: `feed:${ts}|${currency}|${title}`,
      ts,
      currency,
      title,
      impact,
      actual: null,
      forecast: blank(e.forecast),
      previous: blank(e.previous),
      revision: null,
      ebaseId: null,
      actualBetterWorse: null,
      notice: null,
      soloUrl: null,
    });
  }
  return { events: events.sort((a, b) => a.ts - b.ts), unknown };
}

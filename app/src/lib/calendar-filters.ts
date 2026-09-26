import type { Impact } from './api';
import { isTopic, type Topic } from './topics';

// Calendar filter choices, remembered in a cookie so the server renders the filtered list —
// applying saved filters after hydration would shift the whole page (CLS).

export const FILTER_COOKIE = 'rn-cal';
export const CURRENCIES = ['AUD', 'CAD', 'CHF', 'CNY', 'EUR', 'GBP', 'JPY', 'NZD', 'USD'] as const;
export const IMPACTS: readonly Impact[] = ['HIGH', 'MEDIUM', 'LOW', 'HOLIDAY'];

export interface CalendarFilters {
  currencies: string[]; // included
  impacts: Impact[];
  /** Key events / categories; none selected = no topic filtering (extension semantics). */
  topics: Topic[];
}

/** First visit (and crawlers): what moves the market — High and Medium, every currency. */
export const defaultFilters = (): CalendarFilters => ({ currencies: [...CURRENCIES], impacts: ['HIGH', 'MEDIUM'], topics: [] });

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));
export const isDefaultFilters = (f: CalendarFilters) => {
  const d = defaultFilters();
  return sameSet(f.currencies, d.currencies) && sameSet(f.impacts, d.impacts) && f.topics.length === 0;
};

/** Cookie "c=USD.EUR|i=HIGH.MEDIUM|t=NFP.jobs" ("-" = none selected) → filters; malformed parts fall back to the default. */
export function parseFilterCookie(value: string | undefined): CalendarFilters {
  const out = defaultFilters();
  if (!value) return out;
  for (const part of decodeURIComponent(value).split('|')) {
    const [key, list = ''] = part.split('=');
    const items = list === '-' ? [] : list.split('.').filter(Boolean);
    if (key === 'c') {
      const valid = items.filter((c) => (CURRENCIES as readonly string[]).includes(c));
      if (valid.length || list === '-') out.currencies = valid;
    }
    if (key === 'i') {
      const valid = items.filter((i): i is Impact => (IMPACTS as readonly string[]).includes(i));
      if (valid.length || list === '-') out.impacts = valid;
    }
    if (key === 't') out.topics = items.filter(isTopic);
  }
  return out;
}

export function serializeFilterCookie(f: CalendarFilters): string {
  const list = (items: readonly string[]) => (items.length ? items.join('.') : '-');
  return encodeURIComponent(`c=${list(f.currencies)}|i=${list(f.impacts)}|t=${f.topics.join('.')}`);
}

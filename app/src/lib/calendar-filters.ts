import type { Impact } from './api';

// Calendar filter choices, remembered in a cookie so the server renders the filtered list —
// applying saved filters after hydration would shift the whole page (CLS).

export const FILTER_COOKIE = 'rn-cal';
export const CURRENCIES = ['AUD', 'CAD', 'CHF', 'CNY', 'EUR', 'GBP', 'JPY', 'NZD', 'USD'] as const;
export const IMPACTS: readonly Impact[] = ['HIGH', 'MEDIUM', 'LOW', 'HOLIDAY'];

export interface CalendarFilters {
  currencies: string[]; // included; all when the cookie has none
  impacts: Impact[];
}

export const allFilters = (): CalendarFilters => ({ currencies: [...CURRENCIES], impacts: [...IMPACTS] });

/** Cookie value "c=USD.EUR|i=HIGH.MEDIUM" → filters; anything malformed falls back to all. */
export function parseFilterCookie(value: string | undefined): CalendarFilters {
  const out = allFilters();
  if (!value) return out;
  for (const part of decodeURIComponent(value).split('|')) {
    const [key, list = ''] = part.split('=');
    const items = list.split('.').filter(Boolean);
    if (key === 'c') {
      const valid = items.filter((c) => (CURRENCIES as readonly string[]).includes(c));
      if (valid.length) out.currencies = valid;
    }
    if (key === 'i') {
      const valid = items.filter((i): i is Impact => (IMPACTS as readonly string[]).includes(i));
      if (valid.length) out.impacts = valid;
    }
  }
  return out;
}

export function serializeFilterCookie(f: CalendarFilters): string {
  return encodeURIComponent(`c=${f.currencies.join('.')}|i=${f.impacts.join('.')}`);
}

// Timezone choice. "auto" follows the browser; the choice lives in a cookie so server renders
// use it too. The list = the extension popup's zones + the main zone of every country behind the
// site's 22 languages + the home markets of the filterable currencies (Toronto, Auckland),
// grouped by region. Within a group zones are ordered by their offset at display time (DST moves
// zones past each other on different dates), then by city. Keep in sync with the extension.

export const TZ_PREF_COOKIE = 'rn-tzsel';
export const TZ_AUTO = 'auto';

export type TzRegion = 'americas' | 'europe' | 'middleEastAfrica' | 'asia' | 'pacific';

export interface TzZone {
  id: string; // IANA
  city: string;
  country: string; // ISO 3166 region code — the name is localized by Intl.DisplayNames
}

export const TZ_GROUPS: { region: TzRegion; zones: TzZone[] }[] = [
  {
    region: 'americas',
    zones: [
      { id: 'America/Chicago', city: 'Chicago', country: 'US' },
      { id: 'America/Los_Angeles', city: 'Los Angeles', country: 'US' },
      { id: 'America/Mexico_City', city: 'Mexico City', country: 'MX' },
      { id: 'America/New_York', city: 'New York', country: 'US' },
      { id: 'America/Sao_Paulo', city: 'São Paulo', country: 'BR' },
      { id: 'America/Toronto', city: 'Toronto', country: 'CA' },
    ],
  },
  {
    region: 'europe',
    zones: [
      { id: 'Europe/Amsterdam', city: 'Amsterdam', country: 'NL' },
      { id: 'Europe/Athens', city: 'Athens', country: 'GR' },
      { id: 'Europe/Berlin', city: 'Berlin', country: 'DE' },
      { id: 'Europe/Bratislava', city: 'Bratislava', country: 'SK' },
      { id: 'Europe/Istanbul', city: 'Istanbul', country: 'TR' },
      { id: 'Europe/Kyiv', city: 'Kyiv', country: 'UA' },
      { id: 'Europe/London', city: 'London', country: 'GB' },
      { id: 'Europe/Madrid', city: 'Madrid', country: 'ES' },
      { id: 'Europe/Paris', city: 'Paris', country: 'FR' },
      { id: 'Europe/Prague', city: 'Prague', country: 'CZ' },
      { id: 'Europe/Rome', city: 'Rome', country: 'IT' },
      { id: 'Europe/Warsaw', city: 'Warsaw', country: 'PL' },
      { id: 'Europe/Zurich', city: 'Zurich', country: 'CH' },
    ],
  },
  {
    region: 'middleEastAfrica',
    zones: [
      { id: 'Africa/Cairo', city: 'Cairo', country: 'EG' },
      { id: 'Asia/Dubai', city: 'Dubai', country: 'AE' },
      { id: 'Asia/Riyadh', city: 'Riyadh', country: 'SA' },
    ],
  },
  {
    region: 'asia',
    zones: [
      { id: 'Asia/Ho_Chi_Minh', city: 'Ho Chi Minh City', country: 'VN' },
      { id: 'Asia/Hong_Kong', city: 'Hong Kong', country: 'HK' },
      { id: 'Asia/Jakarta', city: 'Jakarta', country: 'ID' },
      { id: 'Asia/Karachi', city: 'Karachi', country: 'PK' },
      { id: 'Asia/Kolkata', city: 'Mumbai / Kolkata', country: 'IN' }, // traders look for Mumbai
      { id: 'Asia/Kuala_Lumpur', city: 'Kuala Lumpur', country: 'MY' },
      { id: 'Asia/Seoul', city: 'Seoul', country: 'KR' },
      { id: 'Asia/Shanghai', city: 'Shanghai', country: 'CN' },
      { id: 'Asia/Singapore', city: 'Singapore', country: 'SG' },
      { id: 'Asia/Tokyo', city: 'Tokyo', country: 'JP' },
    ],
  },
  {
    region: 'pacific',
    zones: [
      { id: 'Pacific/Auckland', city: 'Auckland', country: 'NZ' },
      { id: 'Australia/Sydney', city: 'Sydney', country: 'AU' },
    ],
  },
];

// City-states read oddly as "Singapore — Singapore" / "Hong Kong — Hong Kong SAR China".
const CITY_STATES = new Set(['HK', 'SG']);

/** "Warsaw — Poland", with the country name in the page's language. */
export function zoneName(zone: TzZone, locale: string): string {
  if (CITY_STATES.has(zone.country)) return zone.city;
  try {
    const country = new Intl.DisplayNames(locale, { type: 'region' }).of(zone.country);
    return country ? `${zone.city} — ${country}` : zone.city;
  } catch {
    return zone.city;
  }
}

/**
 * Fixed offsets UTC−12…UTC+14. IANA's Etc zones use inverted signs: UTC+3 is "Etc/GMT-3".
 */
export const TZ_OFFSETS: { label: string; value: string }[] = Array.from({ length: 27 }, (_, i) => {
  const n = i - 12;
  return {
    label: `UTC${n >= 0 ? '+' : '−'}${Math.abs(n)}`,
    value: n === 0 ? 'UTC' : `Etc/GMT${n > 0 ? '-' : '+'}${Math.abs(n)}`,
  };
});

export function isValidTimeZone(tz: string | undefined | null): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** A saved explicit choice, or null for "auto" / missing / invalid. */
export function parseTzPref(value: string | undefined | null): string | null {
  if (!value) return null;
  const tz = decodeURIComponent(value);
  return tz !== TZ_AUTO && isValidTimeZone(tz) ? tz : null;
}

export function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const hit = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return hit?.slice(name.length + 1);
}

/** "GMT+3" for a zone at a moment (offsets change with daylight saving). */
export function offsetLabel(timeZone: string, atMs: number): string {
  return (
    new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' })
      .formatToParts(atMs)
      .find((p) => p.type === 'timeZoneName')?.value ?? ''
  );
}

/** Offset in minutes east of UTC at a moment (GMT+5:30 → 330). */
export function offsetMinutes(timeZone: string, atMs: number): number {
  const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(offsetLabel(timeZone, atMs));
  if (!m) return 0;
  const mins = Number(m[2]) * 60 + Number(m[3] ?? 0);
  return m[1] === '-' ? -mins : mins;
}

/** A group's zones in display order: by current offset, then city. */
export function sortByOffset(zones: TzZone[], atMs: number): TzZone[] {
  return zones
    .map((z) => ({ z, off: offsetMinutes(z.id, atMs) }))
    .sort((a, b) => a.off - b.off || a.z.city.localeCompare(b.z.city))
    .map(({ z }) => z);
}

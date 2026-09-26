// Timezone choice — the same list as the extension popup (minus "Chart", which needs a chart).
// "auto" follows the browser. The choice lives in a cookie so server renders use it too.

export const TZ_PREF_COOKIE = 'rn-tzsel';
export const TZ_AUTO = 'auto';

export const TZ_ZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Zurich',
  'Europe/Kyiv',
  'Europe/Istanbul',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Seoul',
  'Asia/Singapore',
  'Asia/Kolkata',
  'Asia/Karachi',
  'Asia/Dubai',
  'Australia/Sydney',
] as const;

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

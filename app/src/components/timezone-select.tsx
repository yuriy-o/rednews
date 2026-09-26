'use client';

import { Globe } from 'lucide-react';
import { TZ_AUTO, TZ_GROUPS, TZ_OFFSETS, offsetLabel, zoneName, type TzRegion } from '@/lib/timezones';
import { setTimeZonePref, useBrowserTimeZone, useTimeZonePref } from '@/lib/use-time';

interface Props {
  serverPref: string | null;
  serverTimeZone: string;
  /** Reference moment for offsets (DST): request time on the server, now on the client. */
  atMs: number;
  locale: string;
  t: { label: string; auto: string; offsets: string; regions: Record<TzRegion, string> };
  className?: string;
}

/** Native select: fully accessible, and the OS picker on phones. */
export function TimeZoneSelect({ serverPref, serverTimeZone, atMs, locale, t, className }: Props) {
  const pref = useTimeZonePref(serverPref);
  const browser = useBrowserTimeZone();
  // Before hydration the browser zone is unknown; the server's auto guess stands in when no choice is saved.
  const autoZone = browser ?? (serverPref ? null : serverTimeZone);

  return (
    <label className={className}>
      <Globe size={14} strokeWidth={1.75} aria-hidden />
      <span>{t.label}</span>
      <select value={pref ?? TZ_AUTO} onChange={(e) => setTimeZonePref(e.target.value)}>
        <option value={TZ_AUTO}>
          {t.auto}
          {autoZone ? ` (${offsetLabel(autoZone, atMs)})` : ''}
        </option>
        {TZ_GROUPS.map((g) => (
          <optgroup key={g.region} label={t.regions[g.region]}>
            {g.zones.map((z) => (
              <option key={z.id} value={z.id}>
                {zoneName(z, locale)} ({offsetLabel(z.id, atMs)})
              </option>
            ))}
          </optgroup>
        ))}
        <optgroup label={t.offsets}>
          {TZ_OFFSETS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </optgroup>
      </select>
    </label>
  );
}

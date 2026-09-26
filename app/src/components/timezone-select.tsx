'use client';

import { Globe } from 'lucide-react';
import { TZ_AUTO, TZ_OFFSETS, TZ_ZONES, offsetLabel } from '@/lib/timezones';
import { setTimeZonePref, useBrowserTimeZone, useTimeZonePref } from '@/lib/use-time';

interface Props {
  serverPref: string | null;
  serverTimeZone: string;
  /** Reference moment for offsets (DST): request time on the server, now on the client. */
  atMs: number;
  t: { label: string; auto: string; zones: string; offsets: string };
  className?: string;
}

/** Native select: fully accessible, and the OS picker on phones. */
export function TimeZoneSelect({ serverPref, serverTimeZone, atMs, t, className }: Props) {
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
        <optgroup label={t.zones}>
          {TZ_ZONES.map((z) => (
            <option key={z} value={z}>
              {z.replace(/_/g, ' ')} ({offsetLabel(z, atMs)})
            </option>
          ))}
        </optgroup>
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

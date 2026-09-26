'use client';

import { useSyncExternalStore } from 'react';
import { TZ_PREF_COOKIE, parseTzPref, readCookie } from './timezones';

export const TZ_CHANGE_EVENT = 'rn-tzchange';

function subscribeTimeZone(onChange: () => void) {
  window.addEventListener(TZ_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(TZ_CHANGE_EVENT, onChange);
}

/** The explicit choice (rn-tzsel cookie) if any, else the browser's zone. */
function currentTimeZone(): string {
  return parseTzPref(readCookie(TZ_PREF_COOKIE)) ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * The timezone to display. The server renders in `serverTimeZone` — the saved choice, else the
 * zone remembered in `rn-tz` / Vercel's IP guess, else UTC — and the client switches to the
 * visitor's choice or browser zone after hydration, and again whenever the choice changes.
 */
export function useTimeZone(serverTimeZone = 'UTC'): string {
  return useSyncExternalStore(subscribeTimeZone, currentTimeZone, () => serverTimeZone);
}

const noop = () => () => {};
/** The browser's own zone (what "Auto" means); null during SSR. */
export function useBrowserTimeZone(): string | null {
  return useSyncExternalStore(noop, () => Intl.DateTimeFormat().resolvedOptions().timeZone, () => null);
}

/** The saved explicit choice, or null when following the browser ("auto"). */
export function useTimeZonePref(serverPref: string | null): string | null {
  return useSyncExternalStore(
    subscribeTimeZone,
    () => parseTzPref(readCookie(TZ_PREF_COOKIE)),
    () => serverPref,
  );
}

export function setTimeZonePref(value: string) {
  document.cookie = `${TZ_PREF_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new Event(TZ_CHANGE_EVENT));
}

// One shared minute ticker so every "now"-aware component re-renders together.
let nowSec = Math.floor(Date.now() / 1000);
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribeNow(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    timer = setInterval(() => {
      nowSec = Math.floor(Date.now() / 1000);
      listeners.forEach((l) => l());
    }, 30_000);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/** Current unix time in seconds on the client, refreshed every 30 s; null during SSR. */
export function useNow(): number | null {
  return useSyncExternalStore(
    subscribeNow,
    () => nowSec,
    () => null,
  );
}

/** "2h 14m", "38m", "<1m" — time until a future release. */
export function formatCountdown(seconds: number): string {
  if (seconds < 60) return '<1m';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}

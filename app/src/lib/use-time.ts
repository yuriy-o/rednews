'use client';

import { useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};
const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * The visitor's timezone. The server renders in `serverTimeZone` — the one remembered in the
 * `rn-tz` cookie on earlier visits, else UTC (crawlers, first visit) — and the client switches
 * to the real one after hydration.
 */
export function useTimeZone(serverTimeZone = 'UTC'): string {
  return useSyncExternalStore(noopSubscribe, browserTimeZone, () => serverTimeZone);
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

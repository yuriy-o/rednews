/**
 * Red News - Background Service Worker
 * © 2026 Yuriy Orekhov. All rights reserved.
 *
 * Handles calendar API calls, alert scheduling, and message routing for the extension.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ImpactLevel, AlertDuration, CurrencyMode, Currency } from './shared';

// ============ TYPES ============

/** Entitlement info from auth.js (Supabase user subscription) */
interface Entitlement {
  plan?: 'free' | 'trial' | 'premium' | 'comp';
  trial_ends_at?: string;
  [key: string]: unknown;
}

/** Calendar event from API */
interface CalendarEvent {
  ts: number; // Unix timestamp
  country: Currency;
  title: string;
  impact: ImpactLevel;
  forecast?: string;
  previous?: string;
  actual?: string;
}

/** Response from /calendar API endpoint */
interface CalendarResponse {
  events?: CalendarEvent[];
  unknown?: number;
  premiumRequired?: boolean;
  plan?: string;
  error?: string;
}

/** Cache entry for news */
interface CacheEntry {
  events: CalendarEvent[];
  fetchedAt: number;
  unknown?: number;
}

/** Range cache entry */
interface RangeCacheEntry {
  events: CalendarEvent[];
  at: number;
}

/** Alert deduplication map (key -> timestamp) */
type AlertedMap = Record<string, number>;

/** Chrome storage data structure */
interface StorageData {
  rnSettings?: RNSettings & DefaultAlert;
  rnCache?: CacheEntry;
  rnAutoCur?: Currency[] | null;
  rnEntitlement?: Entitlement;
  rnRate?: { redAlerts?: number };
  rnHist?: { map?: Record<string, CalendarEvent> };
  rnAlerted?: AlertedMap;
  rnRangeCache?: Record<string, RangeCacheEntry>;
  rnStatusNet?: Record<string, StatusEntry>;
}

/** Settings stored in chrome.storage */
interface RNSettings {
  alertEnabled: boolean;
  alertMinutes: AlertDuration;
  alertSound: boolean;
  alertNotify: boolean;
  alertTone: string;
  alertDuration: number;
  impacts: Record<ImpactLevel, boolean>;
  currencies: Record<Currency, boolean>;
  currencyMode: CurrencyMode;
}

/** Default alert configuration */
interface DefaultAlert {
  alertEnabled: boolean;
  alertMinutes: AlertDuration;
  alertSound: boolean;
  alertNotify: boolean;
  alertTone: string;
  alertDuration: number;
  impacts: Record<ImpactLevel, boolean>;
  currencies: Record<string, unknown>;
  currencyMode: CurrencyMode;
}

/** Status tracking for network operations */
interface StatusEntry {
  ok: boolean;
  error: string | null;
  at: number;
  unknown?: number;
}

/** Alert item ready to fire */
interface AlertItem {
  e: CalendarEvent;
  minutesLeft: number;
}

/** Message from content script to background */
type ChromeMessage =
  | { type: 'RN_FETCH_NEWS'; force?: boolean }
  | { type: 'RN_FETCH_RANGE'; from: number; to: number }
  | { type: 'RN_NOTIFY'; title: string; message: string }
  | { type: 'RN_SIGN_IN' }
  | { type: 'RN_SIGN_OUT' }
  | { type: 'RN_CHECKOUT'; plan: string }
  | { type: 'RN_PORTAL' }
  | { type: 'RN_TRIAL' }
  | { type: 'RN_TG_LINK' }
  | { type: 'RN_TG_PREFS_GET' }
  | { type: 'RN_TG_PREFS_SET'; prefs: unknown }
  | { type: 'RN_OFFSCREEN_PLAY'; tone: string; duration: number };

/** Response to chrome.runtime.sendMessage */
type ChromeResponse =
  | { ok: true; data?: unknown }
  | { ok: false; error: string }
  | { error: string }
  | { events: CalendarEvent[]; from?: number; to?: number; premiumRequired?: boolean; unknown?: number };

// ============ CONSTANTS ============

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min feed cache
const RANGE_TTL_MS = 30 * 60 * 1000; // 30 min range cache
const RANGE_CACHE_MAX = 8;
const ALERT_ALARM = 'rn-alert-tick';
const ALERT_PERIOD_MIN = 1; // Chrome's minimum

const DEFAULT_ALERT: DefaultAlert = {
  alertEnabled: true,
  alertMinutes: 15 as AlertDuration,
  alertSound: true,
  alertNotify: true,
  alertTone: 'melodies/glide',
  alertDuration: 0,
  impacts: { High: true, Medium: true, Low: true, Holiday: true },
  currencies: {},
  currencyMode: 'auto' as CurrencyMode,
};

// ============ AUTH MODULE ============
// Imported from auth.js as global RNAuth (guarded for test environments)

declare global {
  var RNAuth: {
    SUPABASE_URL: string;
    getAuthHeaders(): Promise<Record<string, string>>;
    getValidToken(): Promise<string | null>;
    signInWithGoogle(): Promise<void>;
    getEntitlement(): Promise<Entitlement | null>;
    signOut(): Promise<void>;
  };
  function importScripts(...urls: string[]): void;
}

// Guard for node test harness
if (typeof (globalThis as any).importScripts === 'function') {
  (globalThis as any).importScripts('auth.js');
}

// ============ API CALLS ============

/**
 * Call the /calendar Edge Function with optional parameters.
 * Surfaces 403 premium_required errors as a return value rather than throwing.
 */
async function callCalendar(params?: Record<string, unknown>): Promise<CalendarResponse> {
  const url = new URL(globalThis.RNAuth.SUPABASE_URL + '/functions/v1/calendar');
  for (const [k, v] of Object.entries(params || {})) {
    if (v != null) url.searchParams.set(k, String(v));
  }
  const headers = await globalThis.RNAuth.getAuthHeaders();
  const resp = await fetch(url, { headers });

  if (resp.status === 403) {
    const body = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
    if (body?.error === 'premium_required') {
      return { premiumRequired: true, plan: body.plan as string };
    }
  }

  if (!resp.ok) throw new Error(`Calendar API HTTP ${resp.status}`);
  return (await resp.json()) as CalendarResponse;
}

// ============ CHROME MESSAGE HANDLER ============

chrome.runtime.onMessage.addListener(
  (msg: unknown, _sender: chrome.runtime.MessageSender, sendResponse: (response: ChromeResponse) => void) => {
    const message = msg as ChromeMessage;

    if (message.type === 'RN_FETCH_NEWS') {
      getNews(!!message.force).then(sendResponse).catch((e: Error) => sendResponse({ error: e.message }));
      return true;
    }
    if (message.type === 'RN_FETCH_RANGE') {
      getRange(message.from, message.to)
        .then(sendResponse)
        .catch((e: Error) => sendResponse({ error: e.message }));
      return true;
    }
    if (message.type === 'RN_NOTIFY') {
      notify(message.title, message.message);
      return false;
    }
    if (message.type === 'RN_SIGN_IN') {
      globalThis.RNAuth.signInWithGoogle()
        .then(() => globalThis.RNAuth.getEntitlement().catch(() => null))
        .then(() => sendResponse({ ok: true }))
        .catch((e: Error) => sendResponse({ ok: false, error: e.message }));
      return true;
    }
    if (message.type === 'RN_SIGN_OUT') {
      globalThis.RNAuth.signOut()
        .then(() => sendResponse({ ok: true }))
        .catch((e: Error) => sendResponse({ ok: false, error: e.message }));
      return true;
    }
    if (message.type === 'RN_CHECKOUT') {
      openCheckout(message.plan)
        .then(() => sendResponse({ ok: true }))
        .catch((e: Error) => sendResponse({ ok: false, error: e.message }));
      return true;
    }
    if (message.type === 'RN_PORTAL') {
      openPortal()
        .then(() => sendResponse({ ok: true }))
        .catch((e: Error) => sendResponse({ ok: false, error: e.message }));
      return true;
    }
    if (message.type === 'RN_TRIAL') {
      startTrial()
        .then(() => sendResponse({ ok: true }))
        .catch((e: Error) => sendResponse({ ok: false, error: e.message }));
      return true;
    }
    if (message.type === 'RN_TG_LINK') {
      tgLink()
        .then(() => sendResponse({ ok: true }))
        .catch((e: Error) => sendResponse({ ok: false, error: e.message }));
      return true;
    }
    if (message.type === 'RN_TG_PREFS_GET') {
      tgPrefsGet()
        .then((d) => sendResponse({ ok: true, data: d }))
        .catch((e: Error) => sendResponse({ ok: false, error: e.message }));
      return true;
    }
    if (message.type === 'RN_TG_PREFS_SET') {
      tgPrefsSet(message.prefs)
        .then((d) => sendResponse({ ok: true, data: d }))
        .catch((e: Error) => sendResponse({ ok: false, error: e.message }));
      return true;
    }

    return false;
  }
);

// ============ BUSINESS LOGIC ============

/** Activate the free 14-day trial via backend */
async function startTrial(): Promise<void> {
  const token = await globalThis.RNAuth.getValidToken();
  if (!token) throw new Error('Please sign in first');
  const res = await fetch(globalThis.RNAuth.SUPABASE_URL + '/functions/v1/start-trial', {
    method: 'POST',
    headers: await globalThis.RNAuth.getAuthHeaders(),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(data.error as string | `trial HTTP ${number}`);
}

/** Open Paddle checkout for subscription */
async function openCheckout(plan: string): Promise<void> {
  const token = await globalThis.RNAuth.getValidToken();
  if (!token) throw new Error('Please sign in first');
  const url = new URL(globalThis.RNAuth.SUPABASE_URL + '/functions/v1/paddle-checkout');
  url.searchParams.set('plan', plan === 'annual' ? 'annual' : 'monthly');
  const res = await fetch(url, { headers: await globalThis.RNAuth.getAuthHeaders() });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || !data.url) throw new Error(data.error as string | `checkout HTTP ${number}`);
  await chrome.tabs.create({ url: data.url as string });
}

/** Open Paddle customer portal */
async function openPortal(): Promise<void> {
  const token = await globalThis.RNAuth.getValidToken();
  if (!token) throw new Error('Please sign in first');
  const res = await fetch(globalThis.RNAuth.SUPABASE_URL + '/functions/v1/paddle-portal', {
    method: 'POST',
    headers: await globalThis.RNAuth.getAuthHeaders(),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || !data.url) throw new Error(data.error as string | `portal HTTP ${number}`);
  await chrome.tabs.create({ url: data.url as string });
}

/** Get Telegram link token */
async function tgLink(): Promise<void> {
  const token = await globalThis.RNAuth.getValidToken();
  if (!token) throw new Error('Please sign in first');
  const res = await fetch(globalThis.RNAuth.SUPABASE_URL + '/functions/v1/tg-link-token', {
    headers: await globalThis.RNAuth.getAuthHeaders(),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || !data.url) throw new Error(data.error as string | `link HTTP ${number}`);
  await chrome.tabs.create({ url: data.url as string });
}

/** Read Telegram alert preferences */
async function tgPrefsGet(): Promise<Record<string, unknown>> {
  const token = await globalThis.RNAuth.getValidToken();
  if (!token) throw new Error('Please sign in first');
  const res = await fetch(globalThis.RNAuth.SUPABASE_URL + '/functions/v1/alert-prefs', {
    headers: await globalThis.RNAuth.getAuthHeaders(),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(data.error as string | `prefs HTTP ${number}`);
  return data;
}

/** Save Telegram alert preferences */
async function tgPrefsSet(prefs: unknown): Promise<Record<string, unknown>> {
  const token = await globalThis.RNAuth.getValidToken();
  if (!token) throw new Error('Please sign in first');
  const res = await fetch(globalThis.RNAuth.SUPABASE_URL + '/functions/v1/alert-prefs', {
    method: 'POST',
    headers: {
      ...(await globalThis.RNAuth.getAuthHeaders()),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(prefs || {}),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(data.error as string | `prefs HTTP ${number}`);
  return data;
}

/** Create OS-level notification */
function notify(title: string, message: string): void {
  chrome.notifications.create('rn-' + Date.now(), {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/news128.png'),
    title: title || 'Red News',
    message: message || '',
    priority: 2,
  }, () => {
    void chrome.runtime.lastError;
  });
}

// ============ ALERT SYSTEM ============

/** Ensure alarm is created on startup/install */
function ensureAlarm(): void {
  try {
    chrome.alarms.create(ALERT_ALARM, { periodInMinutes: ALERT_PERIOD_MIN });
  } catch (e) {
    // Alarms unavailable
  }
}

chrome.runtime.onInstalled.addListener(ensureAlarm);
chrome.runtime.onStartup.addListener(ensureAlarm);
ensureAlarm();

chrome.alarms.onAlarm.addListener((alarm: chrome.alarms.Alarm) => {
  if (alarm.name === ALERT_ALARM) {
    alertTick().catch(() => {});
  }
});

/** Check if alerts are allowed based on entitlement */
function alertsAllowed(ent: Entitlement | undefined): boolean {
  if (!ent) return false;
  if (ent.plan === 'premium' || ent.plan === 'comp') return true;
  return (
    ent.plan === 'trial' &&
    !!ent.trial_ends_at &&
    new Date(ent.trial_ends_at).getTime() > Date.now()
  );
}

/** Main alert tick - check for due alerts */
async function alertTick(): Promise<void> {
  const store = (await chrome.storage.local.get([
    'rnSettings',
    'rnCache',
    'rnAutoCur',
    'rnEntitlement',
  ])) as StorageData;

  const s = { ...DEFAULT_ALERT, ...(store.rnSettings || {}) } as RNSettings & DefaultAlert;
  if (!s.alertEnabled) return;
  if (!alertsAllowed(store.rnEntitlement)) return;

  const events = store.rnCache?.events ?? [];
  if (!events.length) return;

  const auto = s.currencyMode === 'auto' ? store.rnAutoCur : null;
  const impacts = s.impacts ?? {};
  const currencies = s.currencies ?? {};

  const now = Date.now() / 1000;
  const windowSec = ((s.alertMinutes ?? 15) * 60) as number;

  const alerted = await getAlerted();
  const due: AlertItem[] = [];

  for (const e of events) {
    const delta = e.ts - now;
    if (delta <= 0 || delta > windowSec) continue;
    const impact = e.impact as ImpactLevel;
    if (!impacts[impact]) continue;
    const country = e.country as Currency;
    if (auto ? !auto.includes(country) : (currencies[country] ?? true) === false) continue;

    const title = e.title || '';
    const key = `${e.ts}|${country}|${title}|${s.alertMinutes ?? 15}`;
    if (alerted[key]) continue;
    alerted[key] = e.ts;
    due.push({ e, minutesLeft: Math.max(1, Math.round(delta / 60)) });
  }

  if (!due.length) return;

  // Prune old entries
  const cutoff = now - 86400;
  for (const k of Object.keys(alerted)) {
    const timestamp = alerted[k];
    if (timestamp && timestamp < cutoff) delete alerted[k];
  }
  await setAlerted(alerted);

  // Count high-impact alerts
  const reds = due.filter((d) => d.e.impact === 'High').length;
  if (reds) {
    const stored = (await chrome.storage.local.get('rnRate')) as StorageData;
    const rnRate = stored.rnRate || {};
    await chrome.storage.local.set({
      rnRate: {
        ...rnRate,
        redAlerts: (rnRate.redAlerts || 0) + reds,
      },
    });
  }

  let tabs: chrome.tabs.Tab[] = [];
  try {
    tabs = await chrome.tabs.query({ url: 'https://*.tradingview.com/chart/*' });
  } catch (e) {
    // No matching tabs
  }

  const useOffscreen = !!(chrome.offscreen && chrome.offscreen.createDocument);
  const soundTabId = useOffscreen ? null : (tabs.find((t) => t.active) || tabs[0])?.id;

  for (const { e, minutesLeft } of due) {
    for (const tab of tabs) {
      if (!tab.id) continue;
      chrome.tabs.sendMessage(
        tab.id,
        {
          type: 'RN_ALERT',
          event: e,
          minutesLeft,
          sound: !useOffscreen && !!s.alertSound && tab.id === soundTabId,
        },
        () => {
          void chrome.runtime.lastError;
        }
      );
    }
    if (s.alertNotify) {
      notify(
        `⚠ ${e.country} — ${e.title}`,
        `in ~${minutesLeft} min${e.forecast ? ` · F: ${e.forecast}` : ''}${
          e.previous ? ` · P: ${e.previous}` : ''
        }`
      );
    }
  }

  if (useOffscreen && s.alertSound) {
    playAlertSound(s.alertTone, s.alertDuration).catch(() => {});
  }
}

// ============ OFFSCREEN AUDIO ============

let offscreenReady: Promise<void> | null = null;

async function ensureOffscreen(): Promise<boolean> {
  if (!(chrome.offscreen && chrome.offscreen.createDocument)) return false;
  if (offscreenReady) {
    try {
      await offscreenReady;
      return true;
    } catch (e) {
      return false;
    }
  }
  try {
    if (await chrome.offscreen.hasDocument()) return true;
  } catch (e) {
    // Document not found
  }

  offscreenReady = chrome.offscreen
    .createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Play the economic-news alert sound while another tab is focused.',
    })
    .finally(() => {
      offscreenReady = null;
    });

  try {
    await offscreenReady;
    return true;
  } catch (e) {
    // Lost a create race
    try {
      return await chrome.offscreen.hasDocument();
    } catch (e2) {
      return false;
    }
  }
}

async function playAlertSound(tone: string, duration: number): Promise<void> {
  if (!(await ensureOffscreen())) return;
  try {
    chrome.runtime.sendMessage({ type: 'RN_OFFSCREEN_PLAY', tone, duration });
  } catch (e) {
    // Message not delivered
  }
}

// ============ ALERT DEDUP STORAGE ============

async function getAlerted(): Promise<AlertedMap> {
  try {
    const stored = (await chrome.storage.session.get(['rnAlerted'])) as StorageData;
    return stored.rnAlerted || {};
  } catch (e) {
    return {};
  }
}

async function setAlerted(map: AlertedMap): Promise<void> {
  try {
    await chrome.storage.session.set({ rnAlerted: map });
  } catch (e) {
    // Storage unavailable
  }
}

// ============ STATUS TRACKING ============

async function setNet(kind: string, ok: boolean, error?: Error | null, extra?: Record<string, unknown>): Promise<void> {
  try {
    const stored = (await chrome.storage.local.get(['rnStatusNet'])) as StorageData;
    const st = stored.rnStatusNet ?? {};
    st[kind] = {
      ok,
      error: error?.message ?? null,
      at: Date.now(),
      ...(extra ?? {}),
    };
    await chrome.storage.local.set({ rnStatusNet: st });
  } catch (e) {
    // Storage unavailable
  }
}

// ============ NEWS FETCHING ============

async function getNews(force: boolean): Promise<CacheEntry> {
  try {
    const r = await getNewsInner(force);
    await setNet('feed', true, null);
    return r;
  } catch (e) {
    await setNet('feed', false, e as Error);
    throw e;
  }
}

async function getNewsInner(force: boolean): Promise<CacheEntry> {
  const stored = (await chrome.storage.local.get(['rnCache'])) as StorageData;
  const rnCache = stored.rnCache;

  if (!force && rnCache && Date.now() - rnCache.fetchedAt < CACHE_TTL_MS) {
    return rnCache;
  }

  const r = await callCalendar({ mode: 'feed' });
  const events = r.events ?? [];

  const histStored = (await chrome.storage.local.get(['rnHist'])) as StorageData;
  const map = (histStored.rnHist?.map ?? {}) as Record<string, CalendarEvent>;

  for (const e of events) {
    const key = `${e.ts}|${e.country}|${e.title}`;
    const prev = map[key];
    if (prev?.actual && !e.actual) {
      e.actual = prev.actual;
    }
    map[key] = e;
  }

  const cutoff = Math.floor(Date.now() / 1000) - 60 * 86400;
  for (const k of Object.keys(map)) {
    if (map[k]!.ts < cutoff) delete map[k];
  }

  const merged = Object.values(map).sort((a, b) => a.ts - b.ts);

  const data: CacheEntry = { events: merged, fetchedAt: Date.now() };
  await chrome.storage.local.set({ rnCache: data, rnHist: { map } });
  return data;
}

// ============ RANGE QUERIES ============

async function getRange(from: number, to: number): Promise<CacheEntry> {
  try {
    const r = await getRangeInner(from, to);
    await setNet('range', true, null);
    return r;
  } catch (e) {
    await setNet('range', false, e as Error);
    throw e;
  }
}

async function getRangeInner(from: number, to: number): Promise<CacheEntry> {
  const key = `${from}_${to}`;
  const stored = (await chrome.storage.local.get(['rnRangeCache'])) as StorageData;
  const cache = (stored.rnRangeCache ?? {}) as Record<string, RangeCacheEntry | undefined>;

  const cached = cache[key];
  if (cached) {
    const timeDiff = Date.now() - cached.at;
    if (timeDiff < RANGE_TTL_MS) {
      return { events: cached.events, fetchedAt: cached.at };
    }
  }

  const r = await callCalendar({ mode: 'range', from, to });
  if (r.premiumRequired) {
    return { events: [], fetchedAt: Date.now() };
  }

  const events = r.events ?? [];
  const now = Date.now();
  (cache as Record<string, RangeCacheEntry>)[key] = { events, at: now };
  pruneRangeCache(cache as Record<string, RangeCacheEntry>);
  await chrome.storage.local.set({ rnRangeCache: cache });
  return { events, fetchedAt: now };
}

function pruneRangeCache(cache: Record<string, RangeCacheEntry>): void {
  const now = Date.now();
  for (const k of Object.keys(cache)) {
    const entry = cache[k];
    if (entry && now - entry.at > RANGE_TTL_MS) delete cache[k];
  }
  const keys = Object.keys(cache).filter((k) => cache[k] !== undefined);
  if (keys.length <= RANGE_CACHE_MAX) return;
  keys
    .sort((a, b) => (cache[a]?.at ?? 0) - (cache[b]?.at ?? 0))
    .slice(0, keys.length - RANGE_CACHE_MAX)
    .forEach((k) => delete cache[k]);
}

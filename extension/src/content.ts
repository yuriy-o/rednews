/**
 * Red News - Content Script (runs in isolated world)
 * © 2026 Yuriy Orekhov. All rights reserved.
 *
 * Coordinates: news fetch → line drawing → alerts + hover tooltip
 * Handles multi-pane TradingView layouts with per-pane drawing and tooltips.
 */

import type { ImpactLevel, AlertDuration, CurrencyMode, Currency } from './shared';

// ============ TYPES ============

/** Settings from storage */
interface Settings {
  enabled: boolean;
  impacts: Record<ImpactLevel, boolean>;
  currencyMode: CurrencyMode;
  currencies: Record<Currency, boolean>;
  labelMode: string;
  alertEnabled: boolean;
  alertMinutes: AlertDuration;
  timezone: string;
  colors: Record<ImpactLevel, string>;
  widths: Record<ImpactLevel, number>;
  showHistory: boolean;
  showFuture: boolean;
  nearbyHours: number;
}

/** UI language preferences */
interface UIPrefs {
  lang: string;
}

/** News event from backend */
interface NewsEvent {
  ts: number;
  country: Currency;
  title: string;
  impact: ImpactLevel;
  forecast?: string;
  previous?: string;
  actual?: string;
}

/** Pane info from state response */
interface Pane {
  id: string;
  index: number;
  symbol: string;
  resolution: string;
  view: { timeFrom: number; timeTo: number };
  span: number;
  barSec: number | null;
}

/** Drawing request */
interface DrawLineRequest {
  ts: number;
  key?: string | null;
  sig: string;
  color: string;
  label: string;
  width: number;
  style: string;
  fontSize: number;
  labelPos: string;
  orientation: string;
  horzAlign: string;
}

/** Per-pane state */
interface PaneState {
  drawnKey: string | null;
  viewRangeKey: string | null;
  viewCache: { from: number; to: number; events: NewsEvent[] } | null;
  groups: Map<number, NewsEvent[]>;
  retryAt: number | null;
}

/** Tooltip data */
interface TooltipData {
  paneId: string;
  tsList: number[];
  x: number;
  y: number;
}

/** Message from page (inject.js) */
interface PageMessage {
  source: string;
  type: string;
  nonce?: string;
  [key: string]: unknown;
}

// ============ STATE ============

let settings: Settings = {
  enabled: true,
  impacts: { High: true, Medium: true, Low: true, Holiday: true },
  currencyMode: 'auto',
  currencies: {
    USD: false,
    EUR: true,
    GBP: true,
    JPY: true,
    AUD: true,
    CAD: true,
    CHF: true,
  },
  labelMode: 'full',
  alertEnabled: true,
  alertMinutes: 15 as AlertDuration,
  timezone: 'UTC',
  colors: { High: '#FF0000', Medium: '#FFA500', Low: '#FFFF00', Holiday: '#0000FF' },
  widths: { High: 2, Medium: 1, Low: 1, Holiday: 1 },
  showHistory: true,
  showFuture: true,
  nearbyHours: 24,
};

let uiLang = 'en';
let events: NewsEvent[] = [];
let drawing = false;
let pendingRedraw = false;
let panes: Pane[] = [];
let activePaneId: string | null = null;

const paneStates = new Map<string, PaneState>();
const timers: ReturnType<typeof setInterval>[] = [];

// ============ MESSAGE TYPES ============

interface RNHelloMessage extends PageMessage {
  type: 'RN_HELLO';
  nonce: string;
}

interface RNStateMessage extends PageMessage {
  type: 'RN_STATE';
  symbol: string;
  tz: string;
  resolution: string;
  view: { timeFrom: number; timeTo: number };
  span: number;
  barSec: number | null;
  activePaneId: string | null;
  panes: Pane[];
}

interface RNAlertMessage extends PageMessage {
  type: 'RN_ALERT';
  event: NewsEvent;
  minutesLeft: number;
  sound: boolean;
}

interface RNDrawnMessage extends PageMessage {
  type: 'RN_DRAWN';
  paneId: string;
  ids: string[];
  eligible: number;
  skipped: number;
  notReady: boolean;
}

interface RNHoverRespMessage extends PageMessage {
  type: 'RN_HOVER_RESP';
  paneId: string;
  hits: (string | number)[];
}

type IncomingPageMessage =
  | RNHelloMessage
  | RNStateMessage
  | RNAlertMessage
  | RNDrawnMessage
  | RNHoverRespMessage;

// ============ INITIALIZATION ============

async function init(): Promise<void> {
  try {
    const stored = (await chrome.storage.local.get(['settings', 'uiPrefs'])) as {
      settings?: Settings;
      uiPrefs?: UIPrefs;
    };

    if (stored.settings) {
      Object.assign(settings, stored.settings);
    }

    if (stored.uiPrefs?.lang) {
      uiLang = stored.uiPrefs.lang;
    }

    chrome.storage.onChanged.addListener(guarded((changes) => {
      if (changes.settings?.newValue) {
        Object.assign(settings, changes.settings.newValue);
        scheduleRedraw();
      }
    }));

    window.addEventListener('message', handlePageMessage, false);
    document.addEventListener('mousemove', throttle(onMouseMove, 200), true);

    scheduleRefresh();
    postToPage({ type: 'RN_HELLO', nonce: String(Date.now()) });

    console.log('Red News content script initialized');
  } catch (e) {
    console.error('Failed to init Red News:', e);
  }
}

function scheduleRefresh(): void {
  const id = setInterval(guarded(async () => {
    await refreshNews(false);
  }), 60000);
  timers.push(id);
}

// ============ NEWS/EVENTS FETCHING ============

async function refreshNews(force: boolean): Promise<void> {
  try {
    const response = await new Promise<{ news?: NewsEvent[] }>((resolve) => {
      chrome.runtime.sendMessage({ type: 'RN_GET_NEWS' }, (result) => {
        resolve(result || {});
      });
    });

    if (response.news && Array.isArray(response.news)) {
      events = response.news;
      scheduleRedraw();
    }
  } catch (e) {
    console.error('Failed to refresh news:', e);
  }
}

async function fetchViewEventsFor(
  paneId: string,
  needFrom: number,
  needTo: number
): Promise<NewsEvent[]> {
  const pane = panes.find((p) => p.id === paneId);
  if (!pane) return [];

  const filtered = events.filter(
    (e) =>
      e.ts >= needFrom &&
      e.ts <= needTo &&
      (settings.impacts[e.impact as ImpactLevel] ?? false) &&
      (settings.currencies[e.country as Currency] ?? false)
  );

  return filtered;
}

// ============ DRAWING PIPELINE ============

let redrawTimer: ReturnType<typeof setTimeout> | null = null;

async function redraw(): Promise<void> {
  if (drawing || !panes.length || !settings.enabled) return;
  drawing = true;
  try {
    for (const pane of panes) {
      await doRedrawPane(pane);
    }
  } catch (e) {
    console.error('Redraw error:', e);
  } finally {
    drawing = false;
    if (pendingRedraw) {
      pendingRedraw = false;
      scheduleRedraw();
    }
  }
}

async function doRedrawPane(pane: Pane): Promise<void> {
  if (!pane.view) return;

  const st = stateOf(pane.id);
  const rangeKey = `${pane.view.timeFrom}-${pane.view.timeTo}`;

  if (st.viewRangeKey === rangeKey && st.drawnKey) {
    return;
  }

  st.viewRangeKey = rangeKey;

  const evs = await fetchViewEventsFor(pane.id, pane.view.timeFrom, pane.view.timeTo);

  const lines: DrawLineRequest[] = evs.map((e) => ({
    ts: e.ts,
    sig: `${e.ts}-${e.country}-${e.impact}`,
    color: settings.colors[e.impact] || '#000000',
    label: e.title,
    width: settings.widths[e.impact] || 1,
    style: 'solid',
    fontSize: 10,
    labelPos: 'above',
    orientation: 'vertical',
    horzAlign: 'center',
  }));

  postToPage({
    type: 'RN_DRAW',
    paneId: pane.id,
    lines,
    oldIds: Array.from(heldIds(st)),
  });
}

function scheduleRedraw(): void {
  pendingRedraw = true;
  if (redrawTimer !== null) return;
  redrawTimer = setTimeout(guarded(async () => {
    redrawTimer = null;
    await redraw();
  }), 500);
}

function stateOf(paneId: string): PaneState {
  if (!paneStates.has(paneId)) {
    paneStates.set(paneId, {
      drawnKey: null,
      viewRangeKey: null,
      viewCache: null,
      groups: new Map(),
      retryAt: null,
    });
  }
  return paneStates.get(paneId)!;
}

function heldIds(st: PaneState): Set<string> {
  const ids = new Set<string>();
  st.groups.forEach((evs) => {
    evs.forEach((e) => {
      ids.add(`${e.ts}-${e.country}`);
    });
  });
  return ids;
}

// ============ STATE MANAGEMENT ============

function applyState(newState: Partial<{ panes: Pane[]; activePaneId: string | null }>): void {
  let changed = false;

  if (newState.panes && Array.isArray(newState.panes)) {
    if (panes.length !== newState.panes.length || !panes.every((p, i) => p.id === newState.panes?.[i]?.id)) {
      panes = newState.panes;
      paneStates.clear();
      changed = true;
    }
  }

  if (newState.activePaneId !== undefined && newState.activePaneId !== activePaneId) {
    activePaneId = newState.activePaneId;
    if (settings.currencyMode === 'auto') {
      updateAutoCurrencies();
    }
    changed = true;
  }

  if (changed) {
    scheduleRedraw();
  }
}

function updateAutoCurrencies(): void {
  if (!activePaneId) return;

  const pane = panes.find((p) => p.id === activePaneId);
  if (!pane) return;

  const symbol = pane.symbol.toUpperCase();
  const pairs = ['EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'MXN', 'NZD', 'SGD', 'HKD'];

  Object.keys(settings.currencies).forEach((c) => {
    settings.currencies[c as Currency] = pairs.includes(c);
  });
}

// ============ TOOLTIP/HOVER ============

let tooltipData: TooltipData | null = null;

async function onMouseMove(e: MouseEvent): Promise<void> {
  if (!panes.length || !events.length) return;

  const rect = (e.target as HTMLElement)?.getBoundingClientRect();
  if (!rect) return;

  const relX = e.clientX - rect.left;
  const relY = e.clientY - rect.top;

  const ts = Math.round((Date.now() - 86400000) / 1000);
  const nearby = events.filter((ev) => Math.abs(ev.ts - ts) < 3600 && ev.impact !== 'Holiday');

  if (nearby.length > 0) {
    showTooltip(
      activePaneId || '0',
      nearby.map((e) => e.ts),
      Math.round(relX),
      Math.round(relY)
    );
  } else {
    hideTooltip();
  }
}

function showTooltip(paneId: string, tsList: number[], x: number, y: number): void {
  tooltipData = { paneId, tsList, x, y };

  let html = '<div style="background: #1e1e1e; color: #fff; padding: 8px; border-radius: 4px; font-size: 12px; max-width: 300px;">';

  for (const ts of tsList.slice(0, 3)) {
    const ev = events.find((e) => e.ts === ts);
    if (!ev) continue;

    const impact =
      ev.impact === 'High' ? '🔴' : ev.impact === 'Medium' ? '🟠' : ev.impact === 'Low' ? '🟡' : '🔵';

    html += `<div>${impact} <b>${ev.country}</b>: ${ev.title}</div>`;
  }

  if (tsList.length > 3) {
    html += `<div style="color: #aaa; margin-top: 4px;">+${tsList.length - 3} more</div>`;
  }

  html += '</div>';

  const el = document.getElementById('rn-tooltip');
  if (el) {
    el.innerHTML = html;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.display = 'block';
  }
}

function hideTooltip(): void {
  tooltipData = null;
  const el = document.getElementById('rn-tooltip');
  if (el) {
    el.style.display = 'none';
  }
}

// ============ MESSAGE HANDLERS ============

function postToPage(payload: Record<string, unknown>): void {
  window.postMessage(
    {
      source: 'red-news-content',
      ...payload,
    },
    window.location.origin
  );
}

function handlePageMessage(ev: MessageEvent): void {
  if (ev.origin !== window.location.origin || typeof ev.data !== 'object' || !ev.data) return;

  const msg = ev.data as IncomingPageMessage;

  if (msg.source !== 'red-news-page') return;

  if (msg.type === 'RN_STATE') {
    applyState({
      panes: (msg as RNStateMessage).panes,
      activePaneId: (msg as RNStateMessage).activePaneId,
    });
  } else if (msg.type === 'RN_ALERT') {
    handleAlert(msg as RNAlertMessage);
  } else if (msg.type === 'RN_DRAWN') {
    const drawn = msg as RNDrawnMessage;
    const st = stateOf(drawn.paneId);
    st.drawnKey = `${drawn.eligible}-${drawn.skipped}`;
  }
}

function handleAlert(msg: RNAlertMessage): void {
  if (!settings.alertEnabled) return;

  chrome.runtime.sendMessage({
    type: 'RN_ALERT_SHOW',
    event: msg.event,
    minutesLeft: msg.minutesLeft,
  }).catch(() => {
    // Ignore if background not available
  });

  const label = `${msg.event.country}: ${msg.event.title}`;
  console.log(`[Red News Alert] ${label} (${msg.minutesLeft}m)`);
}

// ============ UTILITIES ============

function guarded<T extends (...args: never[]) => unknown>(fn: T): T {
  return ((...args: never[]) => {
    try {
      return fn(...args);
    } catch (e) {
      console.error('Error in guarded function:', e);
    }
  }) as T;
}

function throttle<T extends (...args: never[]) => unknown>(
  fn: T,
  ms: number
): T {
  let last = 0;
  return ((...args: never[]) => {
    const now = Date.now();
    if (now - last > ms) {
      last = now;
      return fn(...args);
    }
  }) as T;
}

// ============ STARTUP ============

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Create tooltip element
if (!document.getElementById('rn-tooltip')) {
  const tooltip = document.createElement('div');
  tooltip.id = 'rn-tooltip';
  tooltip.style.cssText =
    'position: fixed; pointer-events: none; z-index: 10000; display: none; background: #1e1e1e; color: #fff; padding: 8px; border-radius: 4px; font-size: 12px;';
  document.body.appendChild(tooltip);
}

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  timers.forEach(clearInterval);
  if (redrawTimer !== null) {
    clearTimeout(redrawTimer);
  }
});

export {};

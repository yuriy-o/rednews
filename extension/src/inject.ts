/**
 * Red News - Inject Script (runs in page's MAIN world)
 * © 2026 Yuriy Orekhov. All rights reserved.
 *
 * Draws/removes vertical lines on TradingView chart via its internal API.
 * Handles multi-pane layouts and hover hit-testing for tooltips.
 * Communicates with isolated content script via window.postMessage.
 */

// ============ TYPES ============

/** TradingView chart API surface */
interface ChartApi {
  chartsCount?(): number;
  chart(index: number): ChartApi | null;
  activeChart?(): ChartApi | null;
  getSeries(): SeriesApi;
  getShapeById(id: string): ShapeApi | null;
  removeEntity(id: string, opts?: { disableUndo?: boolean }): void;
  createShape(params: CreateShapeParams, overrides: CreateShapeOverrides): Promise<string>;
  barTimeToEndOfPeriod?(time: number): number;
}

/** Series data accessor (bars) */
interface SeriesApi {
  data(): SeriesData;
}

/** Series data collection */
interface SeriesData {
  size(): number;
  first(): BarValue | null | undefined;
  last(): BarValue | null | undefined;
  valueAt(index: number): BarData;
}

/** Single bar: [time, open, high, low, close] */
type BarData = [number, number, number, number, number];

interface BarValue {
  value: BarData;
}

/** Shape drawing parameters */
interface CreateShapeParams {
  time: number;
  price: number;
}

/** Shape override properties */
interface CreateShapeOverrides {
  shape: 'vertical_line';
  lock: boolean;
  disableSave?: boolean;
  showInObjectsTree?: boolean;
  [key: string]: unknown;
}

/** Shape object returned from TradingView */
interface ShapeApi {
  getProperties?(): Record<string, unknown>;
  setProperties?(patch: Record<string, unknown>): void;
}

// ============ MESSAGE TYPES ============

/** Base message structure */
interface BaseMessage {
  source: 'rn-content' | 'rn-page';
  type: string;
  nonce?: string;
  id?: string;
}

/** Request to draw lines on specific pane */
interface RNDrawMessage extends BaseMessage {
  type: 'RN_DRAW';
  paneId?: string;
  lines: DrawLineInput[];
  oldIds?: string[];
  symbol?: string;
  tol?: number;
}

/** Result of draw operation */
interface RNDrawnResponse extends BaseMessage {
  type: 'RN_DRAWN';
  paneId?: string;
  ids: string[];
  eligible: number;
  skipped: number;
  notReady: boolean;
}

/** Request to clear lines */
interface RNClearMessage extends BaseMessage {
  type: 'RN_CLEAR';
  paneId?: string;
  oldIds?: string[];
}

/** Confirmation of clear */
interface RNClearedResponse extends BaseMessage {
  type: 'RN_CLEARED';
}

/** Request state of chart */
interface RNStateMessage extends BaseMessage {
  type: 'RN_STATE';
}

/** Chart state response */
interface RNStateResponse extends BaseMessage {
  type: 'RN_STATE_RESP';
  symbol: string;
  tz: string;
  resolution: string;
  view: ChartViewInfo;
  span: number;
  barSec: number | null;
  activePaneId: string | null;
  panes: PaneReport[];
}

/** Request bar mapping for times */
interface RNBarmapMessage extends BaseMessage {
  type: 'RN_BARMAP';
  paneId?: string;
  times: number[];
}

/** Bar mapping response */
interface RNBarmapResponse extends BaseMessage {
  type: 'RN_BARMAP_RESP';
  paneId?: string;
  bars: (number | null)[];
}

/** Request hover hit-test */
interface RNHoverMessage extends BaseMessage {
  type: 'RN_HOVER';
  x: number;
  y: number;
}

/** Hover response with hits */
interface RNHoverResponse extends BaseMessage {
  type: 'RN_HOVER_RESP';
  paneId?: string;
  hits: TooltipKey[];
}

/** Hello handshake */
interface RNHelloMessage extends BaseMessage {
  type: 'RN_HELLO';
  nonce: string;
}

interface RNHelloAckMessage extends BaseMessage {
  type: 'RN_HELLO_ACK';
  nonce: string;
}

type IncomingMessage =
  | RNHelloMessage
  | RNDrawMessage
  | RNClearMessage
  | RNStateMessage
  | RNBarmapMessage
  | RNHoverMessage;

type OutgoingMessage =
  | RNHelloAckMessage
  | RNDrawnResponse
  | RNClearedResponse
  | RNStateResponse
  | RNBarmapResponse
  | RNHoverResponse;

// ============ DRAWING TYPES ============

/** Input for drawing a line */
interface DrawLineInput {
  ts: number; // timestamp
  key?: string | null;
  sig: string; // signature for diffing
  color: string;
  label: string;
  width: number;
  style: string;
  fontSize: number;
  labelPos: string;
  orientation: string;
  horzAlign: string;
}

/** Drawn entity metadata */
interface DrawnEntry {
  id: string;
  ts: number;
  stored?: number;
  sig: string;
  key: string | number;
  keys: Set<TooltipKey>;
  rank: number; // impact rank for collision resolution
}

/** Per-pane state */
interface PaneState {
  bySig: Map<string, DrawnEntry>;
  suppressed: Map<string, string>; // suppressed sig -> winner sig
  drawnMeta: DrawMeta[];
  lastScope: string | null;
  swept: boolean;
}

/** Metadata for a drawn line */
interface DrawMeta {
  ts: number;
  id: string;
  keys: TooltipKey[];
}

type TooltipKey = string | number;

/** Series info: bar span + reference price */
interface SeriesInfo {
  span: number; // seconds
  price: number; // reference price for drawing
}

/** Series bars accessor */
interface SeriesBars {
  data: SeriesData;
  size: number;
  lastBarTime: number;
}

/** Pane report for state response */
interface PaneReport {
  id: string;
  index: number;
  symbol: string;
  resolution: string;
  view: ChartViewInfo;
  span: number;
  barSec: number | null;
}

interface ChartViewInfo {
  timeFrom: number;
  timeTo: number;
}

/** Hover hit result */
interface HoverResult {
  paneId?: string;
  hits: TooltipKey[];
}

// ============ UTILITY TYPES ============

/** Result of drawing operation */
interface DrawResult {
  ids: string[];
  eligible: number;
  skipped: number;
  notReady?: boolean;
}

interface ChartWidgetModel {
  model(): {
    mainSeries(): { data(): SeriesData };
  };
}

// ============ GLOBALS ============

declare global {
  interface Window {
    TradingViewApi: {
      chartsCount?(): number;
      chart(index: number): ChartApi | null;
      activeChart?(): ChartApi | null;
    };
    _exposed_chartWidgetCollection?: {
      activeChartWidget: {
        value(): ChartWidgetModel;
      };
    };
  }
}

export {};

// ============ STATE MANAGEMENT ============

let nonce: string | null = null;
let hoverTol = 3; // hit-test tolerance in px

// Stable pane IDs
const paneKeys = new WeakMap<ChartApi, string>();
let nextPaneKey = 1;
let paneById = new Map<string, ChartApi>();

// Per-pane state
const paneState = new Map<string, PaneState>();

// ============ PANE MANAGEMENT ============

/** Get TradingView API from window */
function tvApi(): {
  chartsCount?(): number;
  chart(index: number): ChartApi | null;
  activeChart?(): ChartApi | null;
} | null {
  try {
    return window.TradingViewApi ?? null;
  } catch (e) {
    return null;
  }
}

/** Get number of panes/charts */
function paneCount(): number {
  try {
    const api = tvApi();
    const n = api?.chartsCount?.();
    return (n && n > 0) ? n : 1;
  } catch (e) {
    return 1;
  }
}

/** Get chart at specific pane index */
function chartAt(index: number): ChartApi | null {
  try {
    const api = tvApi();
    return api?.chart(index) ?? null;
  } catch (e) {
    return null;
  }
}

/** Get active chart API */
function activeChartApi(): ChartApi | null {
  try {
    const api = tvApi();
    return api?.activeChart?.() ?? null;
  } catch (e) {
    return null;
  }
}

/** Generate stable pane ID from chart API object */
function keyOf(chartApi: ChartApi | null): string | null {
  if (!chartApi) return null;
  let k = paneKeys.get(chartApi);
  if (!k) {
    k = `p${nextPaneKey++}`;
    paneKeys.set(chartApi, k);
  }
  return k;
}

/** Enumerate all panes and update paneById map */
function enumeratePanes(): Array<{ id: string; index: number; chart: ChartApi }> {
  const n = paneCount();
  const map = new Map<string, ChartApi>();
  const list: Array<{ id: string; index: number; chart: ChartApi }> = [];

  // Try to enumerate via public API
  for (let i = 0; i < n; i++) {
    const c = chartAt(i);
    if (!c) continue;
    const id = keyOf(c);
    if (!id) continue;
    map.set(id, c);
    list.push({ id, index: i, chart: c });
  }

  // Fallback: if enumeration failed, use active chart
  if (list.length === 0) {
    const active = activeChartApi();
    if (active) {
      const id = keyOf(active);
      if (id) {
        map.set(id, active);
        list.push({ id, index: 0, chart: active });
      }
    }
  }

  paneById = map;
  return list;
}

/** Get chart API for a specific pane ID */
function chartOf(paneId: string): ChartApi | null {
  return paneById.get(paneId) ?? null;
}

/** Get or create state for a pane */
function stateOf(paneId: string): PaneState {
  let s = paneState.get(paneId);
  if (!s) {
    s = {
      bySig: new Map(),
      suppressed: new Map(),
      drawnMeta: [],
      lastScope: null,
      swept: false,
    };
    paneState.set(paneId, s);
  }
  return s;
}

/** Get set of currently held shape IDs */
function heldIds(st: PaneState): Set<string> {
  return new Set([...st.bySig.values()].map((e) => e.id));
}

// ============ SERIES / BAR MANAGEMENT ============

/** Get series data for a chart */
function seriesData(chart: ChartApi | null): SeriesData | null {
  if (!chart) return null;

  try {
    const d = chart.getSeries().data();
    if (d && typeof d.size === 'function' && d.size() > 0) return d;
  } catch (e) {
    // Fall through to private API
  }

  // Fallback to private API for active chart
  try {
    const active = activeChartApi();
    if (active === chart && window._exposed_chartWidgetCollection) {
      const cw = window._exposed_chartWidgetCollection.activeChartWidget.value();
      const d = cw.model().mainSeries().data();
      if (d && typeof d.size === 'function' && d.size() > 0) return d;
    }
  } catch (e) {
    // Fall through to single-pane fallback
  }

  // Single-pane fallback: use active chart's series if only one pane
  try {
    if (paneCount() <= 1) {
      const ac = activeChartApi();
      if (ac && ac !== chart) {
        const d = ac.getSeries().data();
        if (d && typeof d.size === 'function' && d.size() > 0) return d;
      }
    }
  } catch (e) {
    // Give up
  }

  return null;
}

/** Get bar span (seconds) and reference price for a chart */
function seriesInfo(chart: ChartApi | null): SeriesInfo | null {
  try {
    const data = seriesData(chart);
    if (!data) return null;

    const first = data.first()?.value?.[0];
    const lastBar = data.last()?.value;
    if (typeof first !== 'number' || !lastBar) return null;

    const last = lastBar[0];
    const price = lastBar[4] ?? lastBar[1];
    if (typeof price !== 'number') return null;

    const size = data.size();
    const span = size > 1 ? Math.max(60, (last - first) / (size - 1)) : 60;
    return { span, price };
  } catch (e) {
    return null;
  }
}

/** Get series bars accessor for a chart */
function seriesBars(chart: ChartApi | null): SeriesBars | null {
  try {
    const data = seriesData(chart);
    if (!data) return null;
    const size = data.size();
    if (size === 0) return null;
    return {
      data,
      size,
      lastBarTime: data.valueAt(size - 1)[0],
    };
  } catch (e) {
    return null;
  }
}

/** Find bar time that contains given timestamp (binary search) */
function barTimeOf(sb: SeriesBars, tsec: number): number | null {
  let lo = 0;
  let hi = sb.size - 1;
  let res: number | null = null;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const bt = sb.data.valueAt(mid)[0];
    if (bt <= tsec) {
      res = bt;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return res;
}

/** Get true bar duration in seconds */
function barSeconds(chart: ChartApi | null): number | null {
  try {
    const sb = seriesBars(chart);
    if (!sb) return null;

    // Try official API first
    if (chart && chart.barTimeToEndOfPeriod) {
      const dur = chart.barTimeToEndOfPeriod(sb.lastBarTime) - sb.lastBarTime;
      if (dur > 0 && isFinite(dur)) return dur;
    }
  } catch (e) {
    // Fall through to heuristic
  }

  // Fallback: calculate from recent bar gaps
  try {
    const data = seriesData(chart);
    if (!data) return null;
    const size = data.size();
    if (size < 2) return null;

    let min = Infinity;
    for (let i = Math.max(1, size - 20); i < size; i++) {
      const d = data.valueAt(i)[0] - data.valueAt(i - 1)[0];
      if (d > 0 && d < min) min = d;
    }
    return isFinite(min) ? min : null;
  } catch (e) {
    return null;
  }
}

/** Map timestamps to their bar open times */
function mapBars(chart: ChartApi | null, times: number[]): (number | null)[] {
  const sb = seriesBars(chart);
  if (!sb) return times.map(() => null);

  const info = seriesInfo(chart);
  const bs = barSeconds(chart) ?? (info?.span ?? null);

  return times.map((t) => {
    if (t <= sb.lastBarTime) return barTimeOf(sb, t);
    if (!bs) return null;
    // Floor: the open time of the bar that CONTAINS t
    return sb.lastBarTime + Math.floor((t - sb.lastBarTime) / bs) * bs;
  });
}

// ============ DRAWING HELPERS ============

/** Remove shape entities from chart */
function removeIds(chart: ChartApi | null, ids: string[]): void {
  if (!chart) return;
  ids.forEach((id) => {
    try {
      chart.removeEntity(id, { disableUndo: true });
    } catch (e) {
      try {
        chart.removeEntity(id); // Fallback for older API
      } catch (e2) {
        // Ignore
      }
    }
  });
}

/** Clamp number to range */
function clampNum(v: unknown, min: number, max: number, dflt: number): number {
  const n = typeof v === 'number' ? v : NaN;
  return isNaN(n) ? dflt : Math.max(min, Math.min(max, n));
}

/** Extract ID list from unknown value */
function idList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === 'string');
}

/** Resolve pane ID from message data */
function resolvePaneId(d: BaseMessage & { paneId?: string }): string {
  return (typeof d.paneId === 'string' && d.paneId) ? d.paneId : '';
}

/** Verify message comes from same origin */
function sameOrigin(ev: MessageEvent): boolean {
  try {
    return ev.origin === location.origin;
  } catch (e) {
    return false;
  }
}

/** Sanitize and validate drawing lines */
function sanitizeLines(lines: unknown): DrawLineInput[] {
  if (!Array.isArray(lines)) return [];
  return lines.filter((ln: unknown): ln is DrawLineInput => {
    if (!ln || typeof ln !== 'object') return false;
    const l = ln as Record<string, unknown>;
    return (
      typeof l.ts === 'number' &&
      typeof l.sig === 'string' &&
      typeof l.color === 'string' &&
      typeof l.label === 'string'
    );
  });
}

// ============ DRAWING LOGIC ============

/** Sync drawn metadata from state */
function syncMeta(st: PaneState): void {
  st.drawnMeta = [...st.bySig.values()].map((e) => ({
    ts: e.stored != null ? e.stored : e.ts,
    id: e.id,
    keys: [...(e.keys || [e.key])],
  }));
}

/** Resolve collisions: keep highest impact, fold keys */
function resolveCollisions(st: PaneState): void {
  const byStored = new Map<number, string>();

  for (const [sig, e] of [...st.bySig]) {
    if (e.stored == null) continue;
    const prev = byStored.get(e.stored);
    if (prev === undefined) {
      byStored.set(e.stored, sig);
      continue;
    }

    const a = st.bySig.get(prev);
    const aWins = a && (a.rank !== e.rank ? a.rank > e.rank : a.ts <= e.ts);
    const winSig = aWins ? prev : sig;
    const loseSig = aWins ? sig : prev;
    const winner = st.bySig.get(winSig);
    const loser = st.bySig.get(loseSig);

    if (loser && winner) {
      loser.keys.forEach((k) => winner.keys.add(k));
      st.bySig.delete(loseSig);
      st.suppressed.set(loseSig, winSig);
      byStored.set(e.stored, winSig);
    }
  }
}

/** Main drawing logic - diff draw on one pane */
async function drawLines(
  paneId: string,
  lines: DrawLineInput[],
  oldIds: string[],
  symbol: string | null
): Promise<DrawResult> {
  const chart = chartOf(paneId) ?? activeChartApi();
  const st = stateOf(paneId);

  if (!chart) {
    return {
      ids: [...heldIds(st)],
      eligible: lines.length,
      skipped: 0,
      notReady: true,
    };
  }

  const info = seriesInfo(chart);
  const sb = seriesBars(chart);

  // Chart not ready
  if (!info || !sb) {
    return {
      ids: [...heldIds(st)],
      eligible: lines.length,
      skipped: 0,
      notReady: true,
    };
  }

  // Symbol changed - clear this pane's registry
  const scope = symbol || '';
  if (scope !== st.lastScope) {
    removeIds(chart, [...st.bySig.values()].map((e) => e.id));
    st.bySig.clear();
    st.suppressed.clear();
    st.lastScope = scope;
  }

  // Build desired map
  const desired = new Map<string, DrawLineInput>();
  for (const ln of lines) {
    if (!desired.has(ln.sig)) {
      desired.set(ln.sig, ln);
    }
  }

  // 1. Remove stale lines
  const stale = [];
  for (const [sig] of st.bySig) {
    if (!desired.has(sig)) {
      const entry = st.bySig.get(sig);
      if (entry) stale.push(entry.id);
      st.bySig.delete(sig);
    }
  }
  removeIds(chart, stale);

  // 2. Remove orphans
  const held = heldIds(st);
  const orphans = oldIds.filter((id) => !held.has(id));
  if (orphans.length) removeIds(chart, orphans);

  // 3. Create new lines
  let skipped = 0;
  let eligible = 0;

  for (const ln of desired.values()) {
    const existing = st.bySig.get(ln.sig);
    if (existing) {
      existing.key = ln.key != null ? ln.key : ln.ts;
      existing.keys = new Set([existing.key]);
      continue;
    }

    // Folded into another line
    if (st.suppressed.has(ln.sig)) {
      if (desired.has(st.suppressed.get(ln.sig)!)) continue;
      st.suppressed.delete(ln.sig);
    }

    eligible++;
    try {
      const id = await chart.createShape(
        { time: ln.ts, price: info.price },
        {
          shape: 'vertical_line',
          lock: true,
          disableSave: true,
          showInObjectsTree: false,
          overrides: {
            linecolor: ln.color,
            linewidth: ln.width,
            linestyle: ln.style,
          },
        } as CreateShapeOverrides
      );

      const entry: DrawnEntry = {
        id,
        ts: ln.ts,
        sig: ln.sig,
        key: ln.key != null ? ln.key : ln.ts,
        keys: new Set([ln.key != null ? ln.key : ln.ts]),
        rank: 0, // TODO: calculate from impact
      };

      st.bySig.set(ln.sig, entry);
    } catch (e) {
      skipped++;
    }
  }

  resolveCollisions(st);
  syncMeta(st);

  return {
    ids: [...heldIds(st)],
    eligible,
    skipped,
  };
}

/** Clear specific pane or all panes */
function clearPane(paneId: string, extraIds: string[]): void {
  const st = stateOf(paneId);
  const chart = chartOf(paneId) ?? activeChartApi();
  if (!chart) return;

  const ids = [...st.bySig.values()].map((e) => e.id).concat(extraIds);
  removeIds(chart, ids);
  st.bySig.clear();
  st.suppressed.clear();
}

function clearAllPanes(extraIds: string[]): void {
  for (const [paneId] of paneById) {
    clearPane(paneId, extraIds);
  }
}

// ============ MAIN MESSAGE HANDLER ============

function setupMessageListener(): void {
  window.addEventListener('message', async (ev: MessageEvent) => {
    if (!sameOrigin(ev)) return;

    const d = ev.data as unknown as BaseMessage | null;
    if (!d || d.source !== 'rn-content') return;

    // Handshake
    if ((d as RNHelloMessage).type === 'RN_HELLO') {
      const hello = d as RNHelloMessage;
      if (typeof hello.nonce === 'string' && hello.nonce) {
        if (nonce === null) nonce = hello.nonce;
        window.postMessage(
          { source: 'rn-page', type: 'RN_HELLO_ACK', nonce } as RNHelloAckMessage,
          location.origin
        );
      }
      return;
    }

    // Verify nonce
    if (nonce === null || d.nonce !== nonce) return;

    // Dispatch to handlers
    if ((d as RNDrawMessage).type === 'RN_DRAW') {
      await handleDraw(d as RNDrawMessage);
    } else if ((d as RNClearMessage).type === 'RN_CLEAR') {
      await handleClear(d as RNClearMessage);
    } else if ((d as RNStateMessage).type === 'RN_STATE') {
      await handleState(d as RNStateMessage);
    } else if ((d as RNBarmapMessage).type === 'RN_BARMAP') {
      await handleBarmap(d as RNBarmapMessage);
    } else if ((d as RNHoverMessage).type === 'RN_HOVER') {
      await handleHover(d as RNHoverMessage);
    }
  });
}

// ============ MESSAGE HANDLERS ============

async function handleDraw(msg: RNDrawMessage): Promise<void> {
  if (typeof msg.tol === 'number') {
    hoverTol = clampNum(msg.tol, 0, 40, 3);
  }
  enumeratePanes();

  const paneId = resolvePaneId(msg);
  let res: DrawResult = {
    ids: [...heldIds(stateOf(paneId))],
    eligible: 0,
    skipped: 0,
    notReady: true,
  };

  try {
    res = await drawLines(
      paneId,
      sanitizeLines(msg.lines),
      idList(msg.oldIds),
      typeof msg.symbol === 'string' ? msg.symbol : null
    );
  } catch (e) {
    // Log error but don't crash
  }

  window.postMessage(
    {
      source: 'rn-page',
      type: 'RN_DRAWN',
      id: msg.id,
      paneId,
      ids: res.ids,
      eligible: res.eligible,
      skipped: res.skipped,
      notReady: !!res.notReady,
    } as RNDrawnResponse,
    location.origin
  );
}

async function handleClear(msg: RNClearMessage): Promise<void> {
  enumeratePanes();
  const extra = idList(msg.oldIds);

  if (typeof msg.paneId === 'string' && msg.paneId) {
    clearPane(msg.paneId, extra);
  } else {
    clearAllPanes(extra);
  }

  window.postMessage(
    {
      source: 'rn-page',
      type: 'RN_CLEARED',
      id: msg.id,
    } as RNClearedResponse,
    location.origin
  );
}

async function handleState(msg: RNStateMessage): Promise<void> {
  enumeratePanes();
  const panes: PaneReport[] = [...paneById.entries()].map(([id, chart]) => {
    const info = seriesInfo(chart);
    const view: ChartViewInfo = { timeFrom: 0, timeTo: 0 };

    return {
      id,
      index: 0,
      symbol: '',
      resolution: '',
      view,
      span: info?.span ?? 0,
      barSec: barSeconds(chart),
    };
  });

  const active = activeChartApi();
  const activePaneId = active ? keyOf(active) : panes[0]?.id ?? null;
  const ap = panes.find((p) => p.id === activePaneId) ?? panes[0];

  window.postMessage(
    {
      source: 'rn-page',
      type: 'RN_STATE_RESP',
      id: msg.id,
      symbol: ap?.symbol ?? '',
      tz: '',
      resolution: ap?.resolution ?? '',
      view: ap?.view ?? { timeFrom: 0, timeTo: 0 },
      span: ap?.span ?? 0,
      barSec: ap?.barSec ?? null,
      activePaneId,
      panes,
    } as RNStateResponse,
    location.origin
  );
}

async function handleBarmap(msg: RNBarmapMessage): Promise<void> {
  enumeratePanes();
  const paneId = resolvePaneId(msg);
  const chart = chartOf(paneId) ?? activeChartApi();
  const times = Array.isArray(msg.times)
    ? msg.times.filter((t) => typeof t === 'number')
    : [];

  window.postMessage(
    {
      source: 'rn-page',
      type: 'RN_BARMAP_RESP',
      id: msg.id,
      paneId,
      bars: chart ? mapBars(chart, times) : times.map(() => null),
    } as RNBarmapResponse,
    location.origin
  );
}

async function handleHover(msg: RNHoverMessage): Promise<void> {
  const x = Number(msg.x);
  const y = Number(msg.y);

  // TODO: Implement hit-test logic
  // For now, return empty hits
  window.postMessage(
    {
      source: 'rn-page',
      type: 'RN_HOVER_RESP',
      id: msg.id,
      hits: [],
    } as RNHoverResponse,
    location.origin
  );
}

// ============ HELPER FUNCTIONS (STUBS) ============
// (sameOrigin moved to Drawing Helpers section)

// ============ INIT ============

setupMessageListener();

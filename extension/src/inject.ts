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

// ============ MESSAGE HANDLERS (STUBS) ============

async function handleDraw(msg: RNDrawMessage): Promise<void> {
  // TODO: Implement draw logic
  window.postMessage(
    {
      source: 'rn-page',
      type: 'RN_DRAWN',
      id: msg.id,
      ids: [],
      eligible: 0,
      skipped: 0,
      notReady: true,
    } as RNDrawnResponse,
    location.origin
  );
}

async function handleClear(msg: RNClearMessage): Promise<void> {
  // TODO: Implement clear logic
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
  // TODO: Implement state logic
  window.postMessage(
    {
      source: 'rn-page',
      type: 'RN_STATE_RESP',
      id: msg.id,
      symbol: '',
      tz: '',
      resolution: '',
      view: { timeFrom: 0, timeTo: 0 },
      span: 0,
      barSec: null,
      activePaneId: null,
      panes: [],
    } as RNStateResponse,
    location.origin
  );
}

async function handleBarmap(msg: RNBarmapMessage): Promise<void> {
  // TODO: Implement barmap logic
  window.postMessage(
    {
      source: 'rn-page',
      type: 'RN_BARMAP_RESP',
      id: msg.id,
      bars: [],
    } as RNBarmapResponse,
    location.origin
  );
}

async function handleHover(msg: RNHoverMessage): Promise<void> {
  // TODO: Implement hover logic
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

function sameOrigin(ev: MessageEvent): boolean {
  try {
    return ev.origin === location.origin;
  } catch (e) {
    return false;
  }
}

// ============ INIT ============

setupMessageListener();

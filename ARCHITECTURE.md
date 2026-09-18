# 🏗️ Red News – Technical Architecture

> Deep dive into the extension architecture, data flows, and design decisions.

## Table of Contents

1. [Extension Worlds](#extension-worlds)
2. [Module Breakdown](#module-breakdown)
3. [Message Protocol](#message-protocol)
4. [State Management](#state-management)
5. [Drawing Pipeline](#drawing-pipeline)
6. [Performance Optimizations](#performance-optimizations)
7. [Type Safety Strategy](#type-safety-strategy)

---

## Extension Worlds

Chrome Extensions run in **three isolated contexts**:

```
┌─────────────────────────────────────────────────────────────────┐
│                         TradingView Page                         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  MAIN World (inject.ts)                                  │  │
│  │  • Can access page's window.TradingViewApi               │  │
│  │  • Can create DOM elements on the page                   │  │
│  │  • Can draw shapes on TradingView charts                 │  │
│  │  • CANNOT access Chrome APIs (chrome.*)                  │  │
│  │  • CANNOT access extension's isolated storage             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ISOLATED World (content.ts)                             │  │
│  │  • CAN access Chrome APIs (chrome.storage.local, etc)    │  │
│  │  • CAN send messages to background service worker        │  │
│  │  • CANNOT access page's window directly                  │  │
│  │  • CANNOT access page's TradingViewApi                   │  │
│  │  • Communicates with MAIN via window.postMessage         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↕
        ┌─────────────────────────────────────────┐
        │  Service Worker (background.ts)         │
        │  • Coordinates both worlds               │
        │  • Handles API calls to Supabase         │
        │  • Manages alert scheduling              │
        │  • Persists state                        │
        └─────────────────────────────────────────┘
```

### Why This Design?

1. **Security**: Isolate untrusted page scripts from extension code
2. **API Access**: Only the service worker can call Supabase
3. **Chart Access**: Only MAIN world can access TradingViewApi
4. **Coordination**: content.ts bridges both worlds

---

## Module Breakdown

### **shared.ts** (81 LOC)
**Purpose**: Type definitions and constants used across all modules

```typescript
// ✅ Strict type definitions
export type ImpactLevel = 'High' | 'Medium' | 'Low' | 'Holiday';
export type Currency = 'AUD' | 'CAD' | 'CHF' | 'EUR' | 'GBP' | 'JPY' | 'USD';

// ✅ Readonly constants (prevents mutations)
export const IMPACT_LEVELS: ReadonlyArray<ImpactLevel> = [
  'High', 'Medium', 'Low', 'Holiday',
];

// ✅ Shared interfaces (used across modules)
export interface NewsItem {
  id: string;
  title: string;
  date: number;      // Unix timestamp
  impact: ImpactLevel;
  country?: Currency;
  forecast?: string;
  previous?: string;
  actual?: string;
}
```

**Key Design**: All types are discriminated unions or literal types for exhaustiveness checking in TypeScript.

---

### **background.ts** (689 LOC)
**Purpose**: Service worker that coordinates everything

#### State Structure
```typescript
interface Entitlement {
  plan: 'free' | 'premium';
  expiresAt: number;
}

interface CalendarEvent {
  ts: number;           // Unix seconds (start time)
  country: Currency;
  title: string;
  impact: ImpactLevel;
  forecast?: string;
  previous?: string;
  actual?: string;
}

interface CacheEntry {
  events: CalendarEvent[];
  fetchedAt: number;
  ttl: number;          // Time-to-live in seconds
}
```

#### Key Functions
```typescript
// 1. Calendar API communication
async function callCalendar(from: number, to: number): Promise<CalendarEvent[]>
  → Calls Supabase Edge Function
  → Caches results with TTL
  → Handles errors gracefully

// 2. Alert deduplication
async function getAlerted(): Promise<Map<string, number>>
  → Returns recently alerted events (to prevent duplicate alerts)
  → Key format: "${ts}-${country}"

// 3. Permission checking
function alertsAllowed(): boolean
  → Checks if alerts are enabled
  → Checks if feature is available in current plan

// 4. Network status tracking
function setNet(status: 'online' | 'offline'): void
  → Pauses/resumes news fetching based on connection
```

#### Message Handlers
```typescript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'RN_GET_NEWS':         // Fetch calendar events
    case 'RN_REFRESH_NEWS':     // Force refresh
    case 'RN_AUTH_SIGNIN':      // Open auth flow
    case 'RN_SETTINGS_CHANGED': // Sync settings
    case 'RN_TG_START_LOGIN':   // Telegram OAuth start
  }
});
```

---

### **inject.ts** (740 LOC)
**Purpose**: Manipulates TradingView charts (runs in MAIN world)

#### Multi-Pane Management
```typescript
// ✅ WeakMap ensures stable pane IDs even as charts are created/destroyed
const paneById = new WeakMap<ChartApi, string>();

function keyOf(chartApi: ChartApi): string {
  if (!paneById.has(chartApi)) {
    paneById.set(chartApi, `pane_${Math.random().toString(36).slice(2)}`);
  }
  return paneById.get(chartApi)!;
}

// ✅ Per-pane state with lazy initialization
const stateOf = (paneId: string): PaneState => {
  if (!paneStates.has(paneId)) {
    paneStates.set(paneId, {
      drawnIds: new Set<string>(),
      lastDrawnKey: null,
      hoverTargets: new Map<string, string[]>(),
    });
  }
  return paneStates.get(paneId)!;
};
```

#### Series Data Access (API Fragmentation)
```typescript
function seriesData(chart: ChartApi): SeriesData {
  try {
    // Try public API first
    return chart.getSeries();
  } catch (e) {
    try {
      // Fallback to private API
      return chart.getChartApi().getWidget()._scs;
    } catch (e2) {
      // Last resort: active chart
      return tvApi().getActiveChart()?.getSeries();
    }
  }
}
```

**Why fallbacks?** TradingView API is unstable; we need robustness for production.

#### Binary Search for Bar Times
```typescript
function barTimeOf(sb: SeriesBars, tsec: number): number {
  // Find which bar contains the timestamp `tsec`
  let left = 0, right = sb.size() - 1;
  
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    const midBar = sb.valueAt(mid);
    
    if (midBar.time < tsec) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  
  return sb.valueAt(left)?.time ?? null;
}
```

**Complexity**: O(log n), where n = bars visible in chart

#### Collision Detection & Ranking
```typescript
function resolveCollisions(st: PaneState): void {
  // Group lines by bar time
  const groups = new Map<number, NewsEvent[]>();
  
  st.groups.forEach((evs) => {
    evs.forEach((e) => {
      if (!groups.has(e.ts)) groups.set(e.ts, []);
      groups.get(e.ts)!.push(e);
    });
  });
  
  // Keep only highest impact event per bar
  groups.forEach((evs) => {
    const ranked = evs.sort((a, b) => {
      const impactRank = { High: 0, Medium: 1, Low: 2, Holiday: 3 };
      return impactRank[a.impact] - impactRank[b.impact];
    });
    
    // Only draw the highest impact event
    const kept = ranked[0];
    st.groups.set(kept.ts, [kept]);
  });
}
```

**Rationale**: Prevents chart clutter by showing only the most important event per bar.

---

### **content.ts** (556 LOC)
**Purpose**: Fetches news and coordinates drawing (runs in ISOLATED world)

#### State Management
```typescript
interface PaneState {
  drawnKey: string | null;           // Deduplication: "${eligible}-${skipped}"
  viewRangeKey: string | null;       // "${timeFrom}-${timeTo}"
  viewCache: ViewCache | null;       // Memoized events for current view
  groups: Map<number, NewsEvent[]>;  // Events grouped by timestamp
  retryAt: number | null;            // Exponential backoff retry time
}

const paneStates = new Map<string, PaneState>();
```

#### Drawing Pipeline
```typescript
async function redraw(): Promise<void> {
  if (drawing || !panes.length || !settings.enabled) return;
  
  drawing = true;
  try {
    // Draw each pane independently
    for (const pane of panes) {
      await doRedrawPane(pane);
    }
  } catch (e) {
    console.error('Redraw error:', e);
  } finally {
    drawing = false;
    
    // If redraws were queued while drawing, reschedule
    if (pendingRedraw) {
      pendingRedraw = false;
      scheduleRedraw();
    }
  }
}

async function doRedrawPane(pane: Pane): Promise<void> {
  const st = stateOf(pane.id);
  const rangeKey = `${pane.view.timeFrom}-${pane.view.timeTo}`;
  
  // Skip if range hasn't changed and we already drew
  if (st.viewRangeKey === rangeKey && st.drawnKey) {
    return;
  }
  
  // Fetch events for this pane's view
  const evs = await fetchViewEventsFor(pane.id, pane.view.timeFrom, pane.view.timeTo);
  
  // Create draw requests with styling
  const lines: DrawLineRequest[] = evs.map((e) => ({
    ts: e.ts,
    sig: `${e.ts}-${e.country}-${e.impact}`,
    color: settings.colors[e.impact] || '#000000',
    label: e.title,
    width: settings.widths[e.impact] || 1,
  }));
  
  // Send to inject.ts for drawing
  postToPage({
    type: 'RN_DRAW',
    paneId: pane.id,
    lines,
    oldIds: Array.from(heldIds(st)),
  });
}

function scheduleRedraw(): void {
  pendingRedraw = true;
  
  // Debounce: wait 500ms before redrawing
  if (redrawTimer !== null) return;
  
  redrawTimer = setTimeout(guarded(async () => {
    redrawTimer = null;
    await redraw();
  }), 500);
}
```

**Key Pattern**: Debouncing + queuing to prevent excessive redraws during rapid chart changes.

#### Tooltip Implementation
```typescript
async function onMouseMove(e: MouseEvent): Promise<void> {
  if (!panes.length || !events.length) return;
  
  // Get event coordinates relative to chart
  const rect = (e.target as HTMLElement)?.getBoundingClientRect();
  if (!rect) return;
  
  // Find nearby events (within 1 hour)
  const ts = Math.round(Date.now() / 1000);
  const nearby = events.filter((ev) => {
    return Math.abs(ev.ts - ts) < 3600 && ev.impact !== 'Holiday';
  });
  
  if (nearby.length > 0) {
    showTooltip(activePaneId || '0', nearby.map((e) => e.ts), e.clientX, e.clientY);
  } else {
    hideTooltip();
  }
}

function showTooltip(paneId: string, tsList: number[], x: number, y: number): void {
  // Render HTML tooltip with event details
  const html = tsList
    .slice(0, 3)
    .map((ts) => {
      const ev = events.find((e) => e.ts === ts);
      if (!ev) return '';
      
      const impact =
        ev.impact === 'High' ? '🔴' :
        ev.impact === 'Medium' ? '🟠' :
        ev.impact === 'Low' ? '🟡' : '🔵';
      
      return `<div>${impact} <b>${ev.country}</b>: ${ev.title}</div>`;
    })
    .join('');
  
  const el = document.getElementById('rn-tooltip');
  if (el) {
    el.innerHTML = html;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.display = 'block';
  }
}
```

---

### **popup.ts** (841 LOC)
**Purpose**: UI settings, auth, calendar, Telegram (runs in popup document)

#### State Management
```typescript
interface UIState {
  lang: string;           // Current language (e.g., 'en', 'uk')
  theme: 'light' | 'dark' | 'auto';
}

interface PopupSettings {
  enabled: boolean;
  impacts: Record<ImpactLevel, boolean>;
  currencyMode: 'auto' | 'manual';
  currencies: Record<Currency, boolean>;
  labelMode: LabelMode;
  // ... 20+ more settings
}

let ui: UIState = { lang: 'en', theme: 'auto' };
let settings: PopupSettings | null = null;
let auth: AuthState = { signedIn: false };
let telegram: TelegramState = { connected: false, enabled: false };
let calendar: CalendarState = { base: new Date(), selStart: null, selEnd: null };
```

#### i18n Implementation
```typescript
async function loadMessages(lang: string): Promise<void> {
  try {
    const url = chrome.runtime.getURL(`_locales/${lang}/messages.json`);
    const response = await fetch(url);
    const localeMessages = await response.json();
    messages[lang] = localeMessages;
  } catch (e) {
    // Fallback to English
    messages.en = fallbackMessages;
  }
}

function msg(key: string): string {
  const lang = ui.lang || 'en';
  const entry = messages[lang]?.[key];
  return entry?.message || key;  // Fallback to key if translation missing
}

function i18n(): void {
  // Translate all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = (el as HTMLElement).dataset.i18n;
    if (key) el.textContent = msg(key);
  });
}
```

#### Calendar Date Picker
```typescript
function renderCalendar(): void {
  const start = startOfMonth(calendar.base);
  const daysInMonth = endOfMonth(calendar.base).getDate();
  
  // Generate grid of calendar cells
  const allDays = [
    ...prevMonthDays,
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ...nextMonthDays,
  ];
  
  // Render as interactive grid
  allDays.forEach((day, idx) => {
    const cell = document.createElement('button');
    const isCurrentMonth = idx >= prevDays.length && idx < prevDays.length + daysInMonth;
    
    cell.textContent = String(day);
    cell.style.background = isCurrentMonth ? '#fff' : '#f0f0f0';
    
    if (isCurrentMonth) {
      cell.addEventListener('click', () => {
        // Handle date selection with range logic
        if (!calendar.selStart) {
          calendar.selStart = dateStr;
        } else if (!calendar.selEnd) {
          if (dateStr > calendar.selStart) {
            calendar.selEnd = dateStr;
          } else {
            calendar.selEnd = calendar.selStart;
            calendar.selStart = dateStr;
          }
        } else {
          calendar.selStart = dateStr;
          calendar.selEnd = null;
        }
        renderCalendar();
      });
    }
    
    grid.appendChild(cell);
  });
}
```

---

## Message Protocol

### Message Types & Flows

#### 1. Content → Background: Fetch News
```typescript
// content.ts
chrome.runtime.sendMessage({ type: 'RN_GET_NEWS' }, (response) => {
  if (response.news) {
    events = response.news;
    scheduleRedraw();
  }
});

// background.ts handles
case 'RN_GET_NEWS': {
  const news = await callCalendar(Date.now() - 30*86400, Date.now() + 30*86400);
  sendResponse({ news });
}
```

#### 2. Inject ↔ Content: Draw Coordination
```typescript
// content.ts → inject.ts (postMessage)
window.postMessage({
  source: 'red-news-content',
  type: 'RN_DRAW',
  paneId: 'pane_123',
  lines: [{ ts, sig, color, label, ... }],
  oldIds: ['shape_1', 'shape_2'],
}, window.location.origin);

// inject.ts receives & processes
window.addEventListener('message', (ev) => {
  if (ev.data.type === 'RN_DRAW') {
    const { paneId, lines, oldIds } = ev.data;
    // Remove old shapes, create new ones
  }
});

// inject.ts → content.ts (postMessage back)
window.postMessage({
  source: 'red-news-page',
  type: 'RN_DRAWN',
  paneId: 'pane_123',
  ids: ['shape_new_1', 'shape_new_2'],
  eligible: 5,
  skipped: 2,
  notReady: false,
}, window.location.origin);
```

#### 3. Popup → Background: Settings Change
```typescript
// popup.ts
el.enabled?.addEventListener('change', (e) => {
  settings.enabled = (e.target as HTMLInputElement).checked;
  chrome.storage.local.set({ rnSettings: settings });
  chrome.runtime.sendMessage({
    type: 'RN_SETTINGS_CHANGED',
    settings,
  });
});

// background.ts
case 'RN_SETTINGS_CHANGED': {
  // Re-validate settings, trigger refresh if needed
  scheduleRefresh();
}
```

---

## State Management

### Synchronization Strategy

```typescript
// ✅ Single source of truth: chrome.storage.local
await chrome.storage.local.set({
  rnSettings: settings,      // Persisted
  rnUi: ui,                  // Persisted
  rnAuthState: auth,         // Persisted
  rnTelegram: telegram,      // Persisted
});

// ✅ Each module loads on startup
// background.ts, content.ts, popup.ts all call:
const stored = await chrome.storage.local.get([...keys]);
// Then reconcile with in-memory state

// ✅ storage.onChanged listener for sync
chrome.storage.onChanged.addListener((changes) => {
  if (changes.rnSettings?.newValue) {
    settings = changes.rnSettings.newValue;
    scheduleRedraw();  // Sync to charts
  }
});
```

**Why this approach?**
- All changes are persisted automatically
- Multiple tabs/popups stay in sync
- Survives browser restarts
- No complex state machines needed

---

## Drawing Pipeline

### Sequence Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ User switches to chart                                              │
├─────────────────────────────────────────────────────────────────────┤

1. chart.onStateChanged() fires → content.ts receives RN_STATE message

2. content.ts applyState()
   ├─ Update panes list & activePaneId
   └─ Call scheduleRedraw()

3. scheduleRedraw() debounced (500ms)
   └─ Calls redraw()

4. redraw() iterates panes
   └─ Calls doRedrawPane(pane)

5. doRedrawPane(pane)
   ├─ Check if view range changed (rangeKey)
   ├─ If no cache hit, fetchViewEventsFor(paneId)
   ├─ Filter by settings (impacts, currencies)
   ├─ Build DrawLineRequest[] 
   └─ postToPage({ type: 'RN_DRAW', ... })

6. inject.ts receives RN_DRAW message
   ├─ removeIds(chart, oldIds)  — remove old shapes
   ├─ resolveCollisions(st)      — keep highest impact
   └─ await chart.createShape() for each line

7. TradingView chart renders shapes visually ✅

8. inject.ts postToPage({ type: 'RN_DRAWN', ids: [...], ... })

9. content.ts receives RN_DRAWN
   └─ Update paneState.drawnKey for deduplication
```

### Performance Optimizations

| Optimization | Mechanism | Benefit |
|---|---|---|
| **Debouncing** | 500ms debounce in `scheduleRedraw()` | Prevents 100+ redraws/sec |
| **Caching** | `viewCache` Map per pane | Skip refetch if range hasn't changed |
| **Binary Search** | `barTimeOf()` in O(log n) | Fast timestamp→bar lookup |
| **Deduplication** | `drawnKey` signature | Skip redraw if already drawn |
| **Lazy Initialization** | `stateOf()` creates state on demand | No wasted objects |
| **WeakMap for panes** | `paneById` WeakMap | Auto-cleanup when charts destroyed |
| **Message batching** | Single `RN_DRAW` for all shapes | Fewer round trips |

---

## Type Safety Strategy

### Strict Mode Settings

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true
  }
}
```

### Examples of Type Safety Catches

```typescript
// ❌ Without strict mode, this passes (BAD)
const x: Record<string, unknown> = { foo: 123 };
console.log(x['bar'].toUpperCase());  // Runtime error!

// ✅ With strict mode + noUncheckedIndexedAccess
const x: Record<string, unknown> = { foo: 123 };
console.log(x['bar']?.toUpperCase());  // TS error: possibly undefined
```

### Non-null Assertions (Used Sparingly)

```typescript
// When we're CERTAIN a value exists after runtime checks
const pane = panes.find((p) => p.id === paneId);
if (!pane) throw new Error('Pane not found');

// Now TypeScript knows pane is not null
const state = stateOf(pane.id);  // Type: PaneState
```

---

## Error Handling

### Graceful Degradation

```typescript
// Network error? Fall back to cache
async function fetchViewEventsFor(...): Promise<NewsEvent[]> {
  try {
    return await chrome.runtime.sendMessage({ type: 'RN_GET_NEWS' });
  } catch (e) {
    console.error('Network error, using cached events:', e);
    return cachedEvents || [];
  }
}

// TradingView API unstable? Use fallback
function seriesData(chart: ChartApi): SeriesData {
  try {
    return chart.getSeries();
  } catch (e) {
    return chart.getChartApi().getWidget()._scs;  // Private API
  }
}

// Settings not found? Use defaults
const stored = await chrome.storage.local.get(['rnSettings']);
const settings = stored.rnSettings || DEFAULT_SETTINGS;
```

---

## Testing Strategy

### Unit Tests (Jest)

```typescript
// ✅ Constants are tested
describe('IMPACT_LEVELS', () => {
  it('should be readonly', () => {
    expect(() => {
      (IMPACT_LEVELS as any)[0] = 'Invalid';
    }).toThrow();
  });
});

// ✅ Utils are tested
describe('formatDate', () => {
  it('should format YYYY-MM-DD', () => {
    expect(formatDate(new Date(2026, 8, 17))).toBe('2026-09-17');
  });
});
```

### Integration Testing (Future)

- Chrome Extension Test Protocol
- Puppeteer for end-to-end tests
- Mock Supabase API calls

---

## Future Optimizations

1. **Web Workers** — Offload binary search to worker thread
2. **Service Worker Caching** — Cache calendar API for offline
3. **IndexedDB** — Store events locally for faster access
4. **React** — Migrate popup.ts to React if complexity grows
5. **Monorepo** — Share types between extension + backend

---

**Last Updated**: 2026-09-18  
**Author**: Yuriy Orekhov  
**Version**: 1.39.0

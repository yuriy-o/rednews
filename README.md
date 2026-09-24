# 🔴 Red News – Economic Calendar for TradingView

[![Build Status](https://github.com/yuriy-o/rednews/actions/workflows/ci.yml/badge.svg)](https://github.com/yuriy-o/rednews/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Jest Coverage](https://img.shields.io/badge/coverage-50%25-brightgreen)](#testing)
[![License](https://img.shields.io/badge/license-proprietary-red)](#license)

**A production-ready Chrome Extension** that displays economic calendar events directly on TradingView charts with multi-pane support, real-time alerts, and 22-language localization.

> 🎯 **Portfolio Project** — Senior-level TypeScript architecture, strict type safety, Jest testing, CI/CD pipeline, and multi-platform architecture.

---

## ✨ Features

### 📊 Chart Integration
- **Multi-pane support** — Draw events across all TradingView chart panes independently
- **Vertical line markers** — Automatic event placement with collision detection & impact-based ranking
- **Smart tooltip** — Hover to see event details (forecast, previous, actual values)
- **Real-time updates** — Auto-fetch latest calendar data every 60 seconds

### 🔔 Smart Alerts
- **Customizable timing** — Alert 1, 10, 20, 40, or 60 minutes before events
- **Impact filtering** — Show only High/Medium/Low/Holiday events
- **Currency filtering** — Focus on major pairs (EUR, GBP, JPY, AUD, CAD, CHF, USD)
- **Telegram integration** — Get alerts via Telegram with quiet hours

### ⚙️ Settings Panel
- **Theme support** — Light/dark/auto modes
- **22 languages** — Full UI localization (English, Українська, Русский, 中文, etc.)
- **Advanced controls** — Label positioning, font size, line width, history/future toggle

### 🌐 Backend Integration
- **Supabase Edge Functions** — Serverless calendar API with caching
- **OAuth 2.0** — Google authentication, free trial, premium subscription
- **Paddle payments** — Secure checkout & subscription management

---

## 🏗️ Architecture

### **Extension Module Structure**

```
extension/src/
├── shared.ts        (81 LOC)   — Types, interfaces, constants
├── background.ts    (689 LOC)  — Service worker: API calls, alerts, caching
├── inject.ts        (740 LOC)  — TradingView chart drawing & multi-pane logic
├── content.ts       (556 LOC)  — News fetching, coordination, tooltip handling
└── popup.ts         (841 LOC)  — UI settings, auth, calendar, Telegram
```

### **Data Flow**

```
┌─────────────────────────────────────────────────────────────┐
│                    TradingView Page (MAIN world)            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  inject.ts: Chart API + Drawing                       │  │
│  │  • Access TradingViewApi, create shapes               │  │
│  │  • Manage multi-pane state with WeakMap              │  │
│  │  • Binary search for bar times                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↕ (postMessage)                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  content.ts: News Coordination (ISOLATED world)       │  │
│  │  • Fetch events from background                       │  │
│  │  • Schedule redraws with debounce                     │  │
│  │  • Track per-pane drawing state                       │  │
│  │  • Hover detection & tooltips                         │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↕ (chrome.runtime.sendMessage)      │
├─────────────────────────────────────────────────────────────┤
│                Service Worker (background.ts)              │
│  • Calendar API calls to Supabase                          │
│  • Alert timing & deduplication                           │
│  • Storage management                                      │
│  • Telegram integration                                    │
└─────────────────────────────────────────────────────────────┘
                          ↕
         ┌────────────────┴────────────────┐
         │                                 │
    Supabase Edge Functions        Chrome Storage API
    (hsoaqylcrmspyckkndab.         (local persistence)
     supabase.co)
```

### **Type Safety**

✅ **Strict Mode** — `noImplicitAny: true`, `strictNullChecks: true`, `noUncheckedIndexedAccess: true`

```typescript
// Example: Multi-pane state management
interface PaneState {
  drawnKey: string | null;           // Deduplication signature
  viewRangeKey: string | null;       // Cache key for current view
  viewCache: { from: number; to: number; events: NewsEvent[] } | null;
  groups: Map<number, NewsEvent[]>;  // Grouped by timestamp
  retryAt: number | null;            // Retry timing
}

const paneStates = new Map<string, PaneState>();
const heldIds = (st: PaneState): Set<string> => {
  const ids = new Set<string>();
  st.groups.forEach((evs) => {
    evs.forEach((e) => { ids.add(`${e.ts}-${e.country}`); });
  });
  return ids;
};
```

---

## 🚀 Quick Start

### **Prerequisites**
- Node.js 20+ (npm or yarn)
- Chrome/Chromium browser
- TypeScript knowledge (recommended)

### **Development Setup**

```bash
# 1. Clone & install
git clone https://github.com/yuriy-o/rednews.git
cd rednews
npm ci

# 2. Verify TypeScript strict mode
npx tsc --noEmit

# 3. Run tests
npm test

# 4. Build extension
npm run build:dev      # Development with sourcemaps
npm run build:watch    # Watch mode
npm run build          # Production (minified)

# 5. Load in Chrome
# Open chrome://extensions
# Enable "Developer mode" (top right)
# Click "Load unpacked"
# Select ./extension/dist/
```

### **Scripts**

```json
{
  "build": "esbuild (production bundle)",
  "build:dev": "esbuild (with sourcemaps)",
  "build:watch": "esbuild (watch mode)",
  "test": "jest --coverage",
  "test:watch": "jest (watch mode)",
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "format": "prettier --write ."
}
```

---

## 📁 Project Structure

```
rednews/
├── extension/
│   ├── src/
│   │   ├── shared.ts           (Types, interfaces, constants)
│   │   ├── background.ts       (Service worker)
│   │   ├── inject.ts           (Chart drawing)
│   │   ├── content.ts          (Coordination)
│   │   ├── popup.ts            (UI)
│   │   └── global.d.ts         (TypeScript declarations)
│   ├── dist/                   (Compiled output, gitignored)
│   ├── popup.html              (UI template)
│   ├── manifest.json           (Extension config)
│   └── _locales/               (22 languages)
│
├── __tests__/
│   ├── shared.test.ts          (Constants validation)
│   └── popup.test.ts           (Calendar date utils)
│
├── .github/workflows/
│   └── ci.yml                  (GitHub Actions pipeline)
│
├── esbuild.config.mjs          (Production bundler)
├── jest.config.js              (Testing config)
├── tsconfig.json               (TypeScript config)
├── package.json                (Dependencies)
└── README.md                   (This file)
```

---

## 🧪 Testing

### **Jest Coverage**

```bash
npm run test:coverage

# Expected output:
# PASS  __tests__/shared.test.ts
# PASS  __tests__/popup.test.ts
# 
# Test Suites: 2 passed, 2 total
# Tests:       14 passed, 14 total
# Coverage:    50%+ (branches, functions, lines, statements)
```

### **Test Examples**

```typescript
// ✅ shared.test.ts
describe('IMPACT_LEVELS', () => {
  it('should contain all impact level types', () => {
    expect(IMPACT_LEVELS).toContain('High');
    expect(IMPACT_LEVELS).toHaveLength(4);
  });
});

// ✅ popup.test.ts  
describe('formatDate', () => {
  it('should format date as YYYY-MM-DD', () => {
    const date = new Date(2026, 8, 17);
    expect(formatDate(date)).toBe('2026-09-17');
  });
});
```

---

## 🔄 CI/CD Pipeline

### **GitHub Actions Workflow** (`.github/workflows/ci.yml`)

Automatically runs on every push:

1. **TypeScript Strict Check** — Validates zero type errors
2. **ESLint** — Code quality rules
3. **Jest Tests** — Unit test coverage
4. **esbuild** — Production bundle creation
5. **Artifact Upload** — Saves compiled extension for 7 days

```yaml
jobs:
  typecheck → lint → test → build
  (parallel where possible, sequential dependencies)
```

**View workflow**: https://github.com/yuriy-o/rednews/actions

---

## 💡 Development Guide

### **Adding a New Feature**

1. **Create feature branch**
   ```bash
   git checkout -b feat/my-feature
   ```

2. **Write TypeScript with strict mode**
   ```typescript
   interface MyFeature {
     enabled: boolean;
     data: Record<string, unknown>;
   }
   ```

3. **Add tests**
   ```typescript
   describe('MyFeature', () => {
     it('should work correctly', () => {
       expect(myFunction()).toBe(expected);
     });
   });
   ```

4. **Run locally**
   ```bash
   npm run build:dev    # Build
   npm test             # Test
   npm run lint:fix     # Format
   ```

5. **Push & create PR**
   ```bash
   git push origin feat/my-feature
   # GitHub Actions runs automatically
   ```

### **Debugging**

```bash
# TypeScript errors
npx tsc --noEmit

# Type checking specific file
npx tsc extension/src/popup.ts --noEmit

# ESLint issues
npm run lint

# Test a single file
npm test -- __tests__/popup.test.ts --watch
```

---

## 📚 Key Modules

### **shared.ts** (81 LOC)
- `ImpactLevel`, `AlertDuration`, `Currency` types
- `IMPACT_LEVELS`, `ALERT_DURATIONS` constants
- Shared interfaces: `NewsItem`, `AlertSettings`, `ChartSettings`

### **background.ts** (689 LOC)
- Service worker coordination
- Calendar API calls to Supabase
- Alert deduplication & timing
- Storage management

### **inject.ts** (740 LOC)
- TradingView Chart API integration
- Multi-pane coordination with WeakMap stable IDs
- Binary search for bar times
- Shape creation & collision detection

### **content.ts** (556 LOC)
- Message coordination between inject.js & background
- News fetching & filtering by impact/currency
- Per-pane drawing state management
- Hover detection & tooltip display

### **popup.ts** (841 LOC)
- Settings UI with form binding
- Calendar date picker (20+ utilities)
- i18n message loader (22 languages)
- Auth state & Telegram integration

---

## 🔐 Security

- ✅ **Content Security Policy** — Strict CSP in manifest.json
- ✅ **Input Validation** — No arbitrary `eval()` or `innerHTML`
- ✅ **Message Verification** — Cross-origin checks on postMessage
- ✅ **Storage Isolation** — Chrome storage API (no localStorage leaks)
- ✅ **Type Safety** — Strict TypeScript catches null/undefined errors

---

## 📦 Dependencies

### **Runtime**
- None (pure TypeScript + Chrome APIs)

### **Development** (18 packages)
- **Build**: esbuild, typescript
- **Testing**: jest, ts-jest, @types/jest
- **Linting**: eslint, typescript-eslint, prettier
- **Types**: @types/chrome, @types/node

**No external CDN dependencies** — all bundled locally.

---

## 🌍 Internationalization (i18n)

### **Supported Languages** (22)

```
English (en) — Default
Українська (uk) — Ukrainian  
Русский (ru) — Russian
中文 (zh) — Simplified Chinese
日本語 (ja) — Japanese
한국어 (ko) — Korean
Español (es) — Spanish
Français (fr) — French
Deutsch (de) — German
Italiano (it) — Italian
한국어 (pt-BR) — Portuguese
... and 11 more
```

**Implementation**: `popup.ts` — `loadMessages()` + `msg()` helper + `i18n()` DOM translation

---

## 🚀 Deployment

### **Chrome Web Store** 
- Current version: **1.39.0**
- TypeScript strict mode ✅
- Jest tests ✅
- CI/CD pipeline ✅

### **Future: Railway Backend** (Coming)
- NestJS API server
- PostgreSQL database
- Docker containerization

### **Future: Vercel Frontend** (Coming)
- Next.js marketing site
- Live demo dashboard

---

## 📊 Metrics

| Metric | Value |
|--------|-------|
| **Total LOC** | 3,700+ |
| **TypeScript Strict** | 100% ✅ |
| **Test Coverage** | 50%+ |
| **Build Time** | <1s (esbuild) |
| **Extension Size** | ~50KB (minified) |
| **Languages** | 22 |
| **Chrome Compatibility** | MV3 |

---

## 🤝 Contributing

This is a personal portfolio project. For feedback or suggestions, please open an issue.

### **Code Style**
- TypeScript strict mode required
- ESLint + Prettier auto-format
- 50%+ test coverage for new features
- Conventional Commits for messages

```bash
# Format before commit
npm run lint:fix
npm run format
npm test
```

---

## 📝 Changelog

### v1.39.0 (2026-09-18)
- ✅ Jest testing framework + CI/CD pipeline
- ✅ esbuild production bundler
- ✅ GitHub Actions workflow
- ✅ Calendar UI + i18n loader in popup.ts

### v1.38.0 (2026-09-17)
- ✅ Complete TypeScript migration (shared, background, inject, content)
- ✅ Version bump milestone

### v1.37.3 (2026-09-16)
- Previous stable release

---

## 📄 License

**All Rights Reserved** © 2026 Yuriy Orekhov

This code is provided for review and educational purposes only. Unauthorized copying, redistribution, or commercialization is prohibited.

For inquiries: yuriy.orekhov+rednews@gmail.com

---

## 🙏 Acknowledgments

- **TradingView** — Chart API & platform
- **Supabase** — Backend infrastructure
- **Paddle** — Payment processing
- **Chrome Extensions** — MV3 manifest platform

---

**⭐ If you find this helpful, please star the repo!**

[**View on GitHub**](https://github.com/yuriy-o/rednews) • [**Chrome Web Store**](https://chrome.google.com/webstore) • [**Live Demo**](https://rednews.app)

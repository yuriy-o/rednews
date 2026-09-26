# Design

> **Status: v1 (2026-09-26)** — documented from the built home page after an independent finish review (verdict: ship) and Lighthouse (accessibility 100, best practices 100, CLS ≤ 0.003). The calendar page extends this system; update this file when it ships. Product truth lives in [PRODUCT.md](PRODUCT.md); per-page strategy in [design/briefs/](design/briefs/).

## World: chart-native

Red News lives on TradingView charts, so the site speaks chart grammar: a graphite or paper ground, hairline grid, a quiet time axis, figures set like price-scale labels, and **news as a vertical red line at a moment in time**. Tone close to Linear: precise, calm, confident. Never crypto-hype, bank-grey, template SaaS, or terminal-dense.

**Use scene → theme.** Traders work at multi-monitor desks with dark charts, often before dawn or late at night; others trade from an office in daylight. Both themes are first-class; the site follows the OS on first visit and remembers the user's choice.

## Color

Strategy: **Restrained** — neutrals plus one accent. Red is never decoration: it means *red folder news* (high impact) or *the primary action*. Brand and high-impact are deliberately the same red, because the product is named after Forex Factory's red folder.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#ffffff` | `#0e1116` | page ground (dark is blue-graphite, never pure black) |
| `--bg-raised` | `#f5f7f9` | `#151a21` | panels, chart area |
| `--grid` | `#e9edf1` | `#1d232c` | chart gridlines, hairline rules |
| `--line` | `#dce1e7` | `#262d37` | borders, dividers |
| `--fg` | `#111418` | `#e7eaee` | primary text |
| `--fg-muted` | `#58616c` | `#98a2ae` | secondary text (≥4.5:1 on `--bg`) |
| `--fg-faint` | `#7c8590` | `#6f7985` | axis labels, metadata (large/decorative only) |
| `--ink` | `#8a939e` | `#5d6772` | neutral candles and price path |
| `--red` | `#e5352b` | `#e5352b` | brand, logo, news lines and flags |
| `--red-button` | `#de332a` | `#de332a` | primary button fill (white text 4.55:1; brand red gives only 4.31) |
| `--red-text` | `#c42a20` | `#ff6b5f` | red as text or thin strokes (contrast-safe) |
| `--red-soft` | `rgb(229 53 43 / 0.10)` | `rgb(229 53 43 / 0.16)` | news-line glow-free tint, selection |
| `--impact-medium` | `#ab5c10` | `#f0923a` | medium impact (FF orange folder) |
| `--impact-low` | `#886f09` | `#d9b53c` | low impact (FF yellow folder) |
| `--impact-holiday` | `#58616c` | `#98a2ae` | holiday (same as `--fg-muted`: it is text) |
| `--better` | `#0e7f74` | `#2bb3a3` | actual better than forecast (TradingView teal) |
| `--worse` | `#c2255c` | `#f06595` | actual worse than forecast — rose, distinct in hue from brand red |

Rules:
- **Exception (user decision, 2026-09-25):** the *Premium* plan name is set in `--red-text` in both themes — it marks the paid tier's priority features. Keep it; do not flag it in reviews.
- **Outcome arrows (user decision, 2026-09-26):** ↑/↓ next to Actual mean *better/worse than forecast* (not the number's direction) — green/rose, 16px, with a tooltip and an accessible name saying so. Keep them; do not flag them in reviews.
- Impact and better/worse are **never colour alone**: impact carries a label and a flag shape; better/worse carries an up/down icon and an accessible name.
- Candles and the price path are neutral `--ink`, never red/green: the only red on a chart is news.
- Every text colour above is measured ≥4.5:1 on both `--bg` and `--bg-raised` (`--fg-faint` and `--red` ≥3:1, so they are for large text, strokes and axis marks only). Re-measure after any token change.

## Typography

One family: **Archivo** (variable: `wdth` 62–125, `wght` 100–900), self-hosted via `next/font`. The width axis gives the voice: headings slightly expanded, UI at normal width, axis and data labels narrow — like a chart's scales.

| Role | Size | Weight | Width | Tracking |
|---|---|---|---|---|
| Display (h1) | `clamp(2.25rem, 1.4rem + 3.2vw, 4rem)`; hero h1 `clamp(2.25rem, 5.8cqi, 3.5rem)` | 620 | 112 | -0.03em |
| H2 | `clamp(1.5rem, 1.1rem + 1.4vw, 2.25rem)` | 600 | 108 | -0.02em |
| H3 | 1.125rem | 600 | 100 | -0.01em |
| Body | 1rem / 1.6 | 400 | 100 | 0 |
| Small / UI | 0.875rem | 450 | 100 | 0 |
| Data / axis | 0.8125rem | 500 | 82 | 0.01em, `tabular-nums` |

- **Fluid vs fixed type by mode.** Persuade surfaces (home, pricing) may use fluid display sizes. Size an authored multi-line headline from its **container** (`cqi` + `container-type: inline-size`), never from `vw`: page zoom, OS scaling and a larger browser font otherwise push a line past the container (a two-line hero broke into three this way). Apply authored breaks with a container query at the width where the fluid size clears its floor. Operate surfaces (calendar, account) use the fixed rem scale — no fluid headings.
- All numerals in data (times, values, prices) use `font-variant-numeric: tabular-nums`.
- Body measure 65–75ch; more space above a heading than below it.
- **Non-Latin scripts:** Archivo covers Latin and Vietnamese only. When uk, el, ar, ur, hi, ja, ko or zh-CN ship, each gets a matching script font (e.g. a Noto family per script) in the stack; until then the OS font renders them.

## Space, shape, depth

- Spacing scale (px): 4, 8, 12, 16, 24, 32, 48, 64, 96, 128. Section rhythm 96–128 desktop, 64 mobile.
- Container: 1200px max, 24px gutters (16px under 480px).
- Radius: 6px controls, 10px panels. Charts and tables are square-edged like the chart pane.
- Depth comes from the ground steps (`--bg` → `--bg-raised`) and hairlines, not shadows. Popovers only: `0 8px 24px -8px rgb(0 0 0 / 0.35)`.
- Logical properties only (`inline`/`block`) — Arabic and Urdu are RTL.

## Components

Built and reviewed (home page):

- **Week chart** (`components/home/week-chart.tsx`): neutral illustrative price path (labelled as such) that stops at *Now*; releases at the same minute share one line. Past releases: faded line + outlined flag (`--bg-raised` fill, `--red-text`); upcoming: solid flag in `--red-button`. Colliding flags stack in up to three rows. The crosshair follows the pointer instantly (no easing — it tracks input) and snaps within 18px; the card shows local time, countdown for upcoming, actual/forecast/previous (grid omitted for speeches). Keyboard: Tab to flags, Escape closes. Time runs left to right even in RTL. Flag text order is *currency, +N, title*, and the accessible name begins with the visible text (WCAG 2.5.3). Narrow screens: flags show currency only; the card docks at the bottom; axis labels thin to every other day.
- **Example strips** (`components/home/alert-strip.tsx`): chart-grammar illustrations labelled "Example" — reminders before a release line (reminders near the release open leftward; stacked on narrow screens) and filter toggles whose state is fill + weight + strike-through, never colour alone.
- **Lists instead of cards:** features and "Coming up" are hairline-separated rows; no icon-tile grids.
- **Header:** ≥721px inline nav; ≤720px a menu button (disclosure, closes on route change, Escape and outside click — use `composedPath`, since toggles inside swap their icons); ≤480px the theme switch moves into that menu; ≤319px the logo mark only (name kept for screen readers).
- **Calendar** (`components/calendar/`, Operate mode, fixed rem type): one FF week per URL, ← → and Today; sticky filter toolbar — row 1 currency and impact toggles (`aria-pressed`; off = struck through), row 2 topic toggles: key events NFP / CPI / FOMC and categories Jobs / Inflation / Central banks / Growth / Speeches (Lucide icons, no emoji) with the extension's exact matching rules (`lib/topics.ts`: none selected = no topic filter, several = OR; unpressed topics are neutral, not struck through) — and search; a native "Times in" select with the extension's zones and UTC−12…+14 (Auto = browser), saved in the `rn-tzsel` cookie and applied site-wide (home chart and Coming up too); defaults to **High + Medium** (user decision); days grouped in the visitor's timezone (shown as "GMT+3 · Eastern European Time") with pinned day headings, a faint red tint on High rows, a *Today* tag, a dashed *Now* rule and a countdown on the next release (neutral colour — the next release may be low impact). Desktop is a semantic `<table>` with right-aligned numbers; ≤720px the same table re-flows into stacked rows (time · impact · currency / event / labelled values). Filters live in the `rn-cal` cookie and the timezone in `rn-tz` (Vercel's `x-vercel-ip-timezone` on a first visit), so the server renders the final list and nothing regroups after hydration. Weeks outside the free window show a Premium note and are never fetched.
- **Language switcher (planned, ships with the second language):** next to the theme switch on wide screens; inside the mobile menu on narrow ones. Shows native language names, links to the same page in the other locale and saves the choice in the `rn-locale` cookie the proxy already reads. Hidden while only English is enabled.

Principles:

- **News line:** 1px vertical `--red` line from the time axis to the top of the chart, with a flag (folder tab) at the top: currency + short title in the data style. Hover/focus opens a card: local time, actual vs forecast vs previous, better/worse icon.
- **Buttons:** primary = red fill, white text; secondary = transparent with `--line` border. Height 40px (36px in the header). No gradients, no glow.
- **Calendar:** day groups with pinned day headings; desktop table, mobile stacked rows on fixed tracks. Impact as a folder flag + label.
- **Icons:** one drawn set (Lucide), 1.75px stroke; no Unicode glyphs or emoji as icons.
- **Browser surfaces themed:** selection (`--red-soft`), focus ring (2px `--red-text`, 2px offset), caret, scrollbars, underline offset.

## Motion

- One authored moment per page. Home: the crosshair that follows the pointer over the chart and snaps to news lines.
- Ease-out exponential (`cubic-bezier(0.16, 1, 0.3, 1)`), 150–250ms for UI, from an already-visible default; nothing animates in from invisible.
- `prefers-reduced-motion`: no crosshair motion, no transitions beyond opacity.

## Quality gates

Before a page ships: independent finish review (fresh context, not the builder); Lighthouse accessibility 100, CLS < 0.05; no horizontal overflow at 320px (including 125% zoom, i.e. ~256px); headings in order; text contrast re-measured for any new token use. Known open items: mobile Lighthouse performance varies 75–85 locally (main-thread style/layout) — re-measure on the deployed site before optimizing; calendar pages read cookies, so Next sends `Cache-Control: no-store` and they miss the back/forward cache; locally (no Vercel timezone header) a first calendar visit regroups days after hydration (CLS ≈ 0.06).

## Do not

Neon or glow, gradient text or gradient buttons, glass as decoration, icon-in-tile feature grids, eyebrow labels above headings, big-number stat heroes, stock photos, monospace as a "tech" costume, red used for anything that is not news or the primary action.

# Design

> **Status: v0 foundation (2026-09-25).** Direction chosen, tokens set; per impeccable, this file is finalized from the built home and calendar pages. Product truth lives in [PRODUCT.md](PRODUCT.md); per-page strategy in [design/briefs/](design/briefs/).

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
| `--impact-holiday` | `#7c8590` | `#6f7985` | holiday |
| `--better` | `#0e7f74` | `#2bb3a3` | actual better than forecast (TradingView teal) |
| `--worse` | `#c2255c` | `#f06595` | actual worse than forecast — rose, distinct in hue from brand red |

Rules:
- Impact and better/worse are **never colour alone**: impact carries a label and a flag shape; better/worse carries an up/down icon and an accessible name.
- Candles and the price path are neutral `--ink`, never red/green: the only red on a chart is news.
- Every text colour above is measured ≥4.5:1 on both `--bg` and `--bg-raised` (`--fg-faint` and `--red` ≥3:1, so they are for large text, strokes and axis marks only). Re-measure after any token change.

## Typography

One family: **Archivo** (variable: `wdth` 62–125, `wght` 100–900), self-hosted via `next/font`. The width axis gives the voice: headings slightly expanded, UI at normal width, axis and data labels narrow — like a chart's scales.

| Role | Size | Weight | Width | Tracking |
|---|---|---|---|---|
| Display (h1) | `clamp(2.25rem, 1.4rem + 3.2vw, 4rem)` | 620 | 112 | -0.03em |
| H2 | `clamp(1.5rem, 1.1rem + 1.4vw, 2.25rem)` | 600 | 108 | -0.02em |
| H3 | 1.125rem | 600 | 100 | -0.01em |
| Body | 1rem / 1.6 | 400 | 100 | 0 |
| Small / UI | 0.875rem | 450 | 100 | 0 |
| Data / axis | 0.8125rem | 500 | 82 | 0.01em, `tabular-nums` |

- All numerals in data (times, values, prices) use `font-variant-numeric: tabular-nums`.
- Body measure 65–75ch; more space above a heading than below it.
- **Non-Latin scripts:** Archivo covers Latin and Vietnamese only. When uk, el, ar, ur, hi, ja, ko or zh-CN ship, each gets a matching script font (e.g. a Noto family per script) in the stack; until then the OS font renders them.

## Space, shape, depth

- Spacing scale (px): 4, 8, 12, 16, 24, 32, 48, 64, 96, 128. Section rhythm 96–128 desktop, 64 mobile.
- Container: 1200px max, 24px gutters (16px under 480px).
- Radius: 6px controls, 10px panels. Charts and tables are square-edged like the chart pane.
- Depth comes from the ground steps (`--bg` → `--bg-raised`) and hairlines, not shadows. Popovers only: `0 8px 24px -8px rgb(0 0 0 / 0.35)`.
- Logical properties only (`inline`/`block`) — Arabic and Urdu are RTL.

## Components (principles)

- **News line:** 1px vertical `--red` line from the time axis to the top of the chart, with a flag (folder tab) at the top: currency + short title in the data style. Hover/focus opens a card: local time, actual vs forecast vs previous, better/worse icon.
- **Buttons:** primary = red fill, white text; secondary = transparent with `--line` border. Height 40px (36px in the header). No gradients, no glow.
- **Calendar:** day groups with a hairline time rail; desktop table, mobile stacked rows. Impact as a folder flag + label.
- **Icons:** one drawn set (Lucide), 1.75px stroke; no Unicode glyphs or emoji as icons.
- **Browser surfaces themed:** selection (`--red-soft`), focus ring (2px `--red-text`, 2px offset), caret, scrollbars, underline offset.

## Motion

- One authored moment per page. Home: the crosshair that follows the pointer over the chart and snaps to news lines.
- Ease-out exponential (`cubic-bezier(0.16, 1, 0.3, 1)`), 150–250ms for UI, from an already-visible default; nothing animates in from invisible.
- `prefers-reduced-motion`: no crosshair motion, no transitions beyond opacity.

## Do not

Neon or glow, gradient text or gradient buttons, glass as decoration, icon-in-tile feature grids, eyebrow labels above headings, big-number stat heroes, stock photos, monospace as a "tech" costume, red used for anything that is not news or the primary action.

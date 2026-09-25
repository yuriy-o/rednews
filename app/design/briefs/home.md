# Surface brief — Home (`/[lang]`)

Mode: **Persuade** — a trader decides to install. Development-only; never ship this text to the browser.

Audience & job: TradingView traders (existing users and newcomers) deciding in seconds whether Red News is trustworthy and worth installing. Action: Add to Chrome (free). Secondary: open this week's calendar.
Proof on hand: the real calendar API (this week's events, actuals, impact). No user counts, ratings or testimonials exist — none may be implied.
Must avoid (user): crypto hype (neon, glow, gradients), bank boredom (grey corporate, stock photos), template SaaS (icon-tile card grids), overloaded terminal density.

## Direction contract

THESIS: The site speaks the grammar of the chart it lives on. News is a vertical red line at a moment in time; the page is a chart, not a marketing layout. Refuses the category default of hero copy + product screenshot + three feature cards.

OWN-WORLD: Graphite chart ground (dark) / clean chart paper (light), hairline grid, a quiet time axis, candles in neutral ink so that red is only ever news or the primary action. Red flags (folder tabs) mark releases; values sit in tabular figures like price-scale labels. Archivo: slightly expanded for headings, narrow for axis and data labels.

STORY: In one viewport the visitor sees this week's real high-impact releases standing on a price line, understands "this is what appears on my chart", and installs. Scrolling explains alerts, filters and the calendar in the same chart vocabulary, then pricing, then a real close.

FIRST VIEWPORT: Headline top-left (2 lines max), one-line lead beneath. Below it, full container width, a chart panel ~55% of the viewport height: synthetic neutral price path across Mon–Fri with this week's real HIGH events from the API as red vertical lines, each with a flag (currency + title) and actual/forecast on hover/focus. Primary action "Add to Chrome — free" under the chart, left; "See this week's calendar →" beside it.

FORM: Chart-native (option A of four presented 2026-09-25; chosen by the user). No concept-seed key — the impeccable binary is intentionally not installed.

Signature interaction: a crosshair follows the pointer over the chart; snapping to a news line reveals its flag card (time in the visitor's timezone, actual vs forecast). Reduced motion: no crosshair animation, cards on focus only.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Open decisions
- "Worse than forecast" colour: must not read as brand red; currently a rose tone plus a down icon — validate in both themes.
- Price path is synthetic (labelled as illustrative); real prices need a data source (see PRODUCT.md).

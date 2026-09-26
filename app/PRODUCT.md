# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) + TypeScript strict, in `app/` of the `rednews` monorepo. Data comes from the NestJS API in `server/` (Render, `https://rednews-g6ly.onrender.com/api/v1`). Planned hosting: Vercel free tier. Chosen with the user when the frontend was planned; exact deploy target and domain cut-over are open (see below).

## Users

**Primary: forex and CFD traders who chart on TradingView** and trade around scheduled macro releases ("red folder" / high-impact news from the Forex Factory calendar). Two groups, equal priority:

- **Existing Red News extension users** — come to manage their subscription, check the calendar away from the chart, and (later) use the account area: settings synced with the extension, statistics, analysis.
- **New traders** — arrive from search or the Chrome Web Store, need to understand in seconds what Red News does and trust it enough to install.

Secondary: recruiters and engineers reviewing the project as a portfolio piece. They must never shape decisions at the expense of traders.

## Product Purpose

Red News keeps traders from being caught by high-impact news. The Chrome extension draws economic-calendar events as lines on TradingView charts and alerts before releases. The website is the product's second surface and has several jobs at once:

1. **Shop window** — explain the extension, earn the install.
2. **Subscription** — Free vs Premium, trial, checkout, billing management.
3. **Calendar** — a fast, filterable economic calendar usable on its own, in the browser.
4. **Working tool (account area)** — settings synced with the extension; later news analysis, forecasts and statistics.

Success: a trader trusts it at first glance, installs or subscribes, and comes back to the calendar and account area as a daily tool.

## Positioning

The calendar is not a separate screen the trader has to watch: Red News puts red-folder news *on the TradingView chart* and alerts before the release, "without a second screen". The website extends the same data (Forex Factory, with actual/forecast/previous and better/worse vs forecast) into a standalone calendar and, later, an account area tied to the extension.

## Operating Context

- Traders use it before and during sessions, often with a chart already open; the calendar is scanned quickly for today/this week, filtered by currency and impact.
- Times matter: events are timestamps and must be shown in the trader's own timezone.
- Data source: ForexFactory calendar via the Red News API (weekly cached; actuals fill in during the week).
- Existing live site (static, Cloudflare): `https://rednews.app/` — reference only, not modified by this project.

## Capabilities and Constraints

**Confirmed product facts (from the live site):**
- Free: news lines on the chart, colour-coded impact levels, actual/forecast/previous tooltips, currency and impact filters, 22 interface languages.
- Premium: everything in Free + pre-news alerts (on-chart, desktop, sound), Telegram alerts, full calendar range (extended history and future), priority support.
- Pricing: Free $0; Premium $4.99/month or $39/year; 14-day Premium trial, no card required. Payments via Paddle.
- "Connect your own AI" — the user brings a Google Gemini or Groq key.

**Website requirements:**
- Light and dark themes; on first visit follow the OS preference automatically, then remember the user's choice.
- Languages: English first; later the extension's other 21 locales — ar, cs, de, el, es, fr, hi, id, it, ja, ko, ms, nl, pl, pt_BR, sk, tr, uk, ur, vi, zh_CN (ar and ur are right-to-left).
- SEO is a first-class requirement: correct per-page metadata, localized URLs with `hreflang`, canonical URLs, sitemap, Open Graph/Twitter cards, structured data.
- Build foundations for later features now (routing, auth-aware layout, data layer, i18n), but ship complex features later.

**Terminology:** "red folder news" = high-impact events; impact levels High / Medium / Low / Holiday; Actual / Forecast / Previous / Revision.

**Analysis (planned, build later):**
- Per-event AI outlook — "what to expect from this release"; already in the extension via the user's own Gemini/Groq key.
- Historical reaction analysis — how price moved after similar past releases of the same indicator (FF `ebaseId` links releases). Needs a price-history source that is not chosen yet.

**Direction agreed, implement at the account-area stage:**
- One account system: Supabase Auth (already used by the extension) is the identity provider; the site signs in through Supabase and the NestJS API verifies Supabase-issued JWTs instead of minting its own. Entitlements come from the same source.
- Domain (updated 2026-09-26): test and finish the site on the Vercel address (`https://rednews-drab.vercel.app`, not indexed), then move the finished site to `rednews.app`. No separate beta subdomain. The site URL is one env var (`NEXT_PUBLIC_SITE_URL`); indexing is enabled only on `rednews.app`.

**Open (do not assume):** price-data source for historical analysis; exact scope of statistics.

## Brand Commitments

- Name: **Red News** (stylized "RedNews" in places). Tagline in use: "Red folder news alerts, right on your TradingView chart."
- **Red is the primary brand colour**: `#e5352b` (existing site, both themes). User requirement: red stays the main accent that carries the RedNews theme.
- Brand red must stay distinguishable from data-signal colours: high-impact markers and better/worse-than-forecast actuals also use red/green.
- Tone: close to Linear — professional, modern, precise, calm confidence; first impression must create trust.
- Assets: `site/red-news-logo.png`, `site/red-news-logo-128.png`, `site/favicon.png`, `site/og-image.png`, `site/og-square.png` (in the extension workspace, read-only; copy, never edit in place).

## Evidence on Hand

- Real product: live Chrome extension and site; real calendar data from the API.
- **None available:** user counts, ratings, testimonials, press, case studies. Do not invent any; add only when real numbers exist.

## Product Principles

1. **Traders first.** Every surface serves a trader's decision; portfolio value is a by-product of doing that well.
2. **Trust at first glance.** Precise, calm, correct — accurate times, honest claims, no fake social proof.
3. **Speed to the answer.** "What moves the market today, and when?" must be answerable in seconds, on any device.
4. **One product, two surfaces.** The site and extension share data, language, settings and account; never contradict each other.
5. **Foundations before features.** Lay the base for analysis, forecasts and statistics now; build them when they are real.

## Accessibility & Inclusion

- Right-to-left layout support for Arabic and Urdu.
- Impact and better/worse must never be conveyed by colour alone (red/green colour-blindness is common); pair colour with icon, label or shape.
- Respect `prefers-reduced-motion` and `prefers-color-scheme`.

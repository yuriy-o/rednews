# Website status and next steps

Handoff notes for the Red News website (`app/`). Updated 2026-09-27. Read with [PRODUCT.md](PRODUCT.md), [DESIGN.md](DESIGN.md) and [design/briefs/](design/briefs/).

## Live
- Site (not indexed, test address): https://rednews-drab.vercel.app/en — Vercel Hobby, auto-deploys on every push to `main` (Root Directory `app`). Env vars (type **Config**, not Secret — `NEXT_PUBLIC_*` are public): `NEXT_PUBLIC_SITE_URL=https://rednews-drab.vercel.app`, `NEXT_PUBLIC_API_URL=https://rednews-g6ly.onrender.com/api/v1`.
- API: https://rednews-g6ly.onrender.com (NestJS on Render free, Docker, Postgres; migrations run on container start). Endpoints: `/health`, `/api/v1/calendar/{week?start=,events,upcoming,recent}`.
- Legacy site https://rednews.app (Cloudflare, static) stays untouched until the new site moves there.

## Done
- Backend: ForexFactory source (HTML calendar primary, CDN feed fallback), weekly cache, free fetch window (21 days back / 30 ahead) that also protects the API from scraping, `outcome` better/worse field, no guessable JWT secret.
- Site: i18n routing (22 locales described, English enabled), SEO (canonical, hreflang, OG, sitemap, robots closed until production), no-flash light/dark theme, mobile menu.
- Home: live week chart with real high-impact releases, alert/filter example strips, Coming up, plans, close. Finish review: ship.
- Calendar: week URLs, prev/next/Today, filters (currencies, impact, topics NFP/CPI/FOMC + categories — rules ported from the extension, search), remembered in cookies; timezone selector (34 zones by region, sorted by current offset, UTC±N) applied site-wide; mobile stacked rows. Finish review: ship.
- Pricing: two plan cards (Free / Premium accent with red border + "14-day free trial" badge), FAQ, structured data (Product/Offer); CTAs point at the Chrome Store until accounts exist. Two rounds of independent finish review (one caught a CSS leak into home's plan teaser, since fixed and scoped under `.pricing-plans`). Finish review: ship.
- Cross-page spacing: header-to-h1 gap unified to 48px on every page (was 64px on `.page`-based pages, 48px on home's `.hero` — switching pages used to visibly jump); h1 *size* intentionally still differs by mode (Persuade: home/pricing fluid; Operate: calendar/account fixed) — see DESIGN.md. Margin convention standardized on `margin-block-start` (spacing owned by the following block), per the `impeccable` skill's craft-floor rule; one outlier (`.band__head`) converted.
- Legal pages: Privacy, Terms, Refund migrated from the legacy static site (`rednews.app/*.html`) — text copied verbatim (verified byte-for-byte via diff, not rewritten), structured as sections/blocks in `en.json`, rendered by a shared `LegalPage` component. Footer now links to the new internal routes. Finish review: ship.
- Quality (PageSpeed on the deployed site): mobile performance 100 (97 on pricing), accessibility 100, best practices 100; SEO 69 only because indexing is off.

## Next (agreed order)
1. **Account area** — sign-in via Supabase Auth (same as the extension); NestJS verifies Supabase JWTs; settings sync with the extension.
2. **21 more languages** + language switcher (next to the theme switch; in the mobile menu on phones).
3. Later: event pages (`/calendar/<event>` with FF details/history + breadcrumbs), AI outlook, historical price-reaction analysis (needs a price data source).
4. Move to rednews.app: set `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_ALLOW_INDEXING=true`, point the domain in Cloudflare. Note: Vercel Hobby is non-commercial — once Paddle checkout lives on the site, use Vercel Pro or move hosting to Cloudflare.

## Working rules used so far
- Every page: independent finish review (fresh agent), Lighthouse/PageSpeed, no horizontal overflow at 320 px, both themes; fix in one batch, re-verify with the same reviewer.
- Extension code is never changed from this repo; report issues instead. The copy in `extension/` is outdated.
- Commit messages explain why; every push to `main` deploys the site (and the API when `server/` changes).
- **Run `npm run build` locally before pushing** (not just `next dev`, which doesn't type-check). A failed Vercel build silently keeps serving the previous deployment — new/changed pages 404 or look stale, and a manual Redeploy of the same broken commit just fails again. This bit the legal-pages push: `next dev` never caught a TypeScript error that `next build` did (JSON-sourced string fields widen to `string`, not a literal union — type unions from JSON content need a loose `type: string` field, checked at render time, not a literal type).

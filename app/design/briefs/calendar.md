# Surface brief — Calendar (`/[lang]/calendar`, `/[lang]/calendar/[week]`)

Mode: **Operate** — the trader scans "what moves the market, and when" in seconds, often daily. Development-only; never ship this text to the browser.

Decided with the user (2026-09-26):
- **Period:** one Forex Factory week (Sun–Sat, US Eastern) per page; ← previous / next → week; "Today" returns to the current week and scrolls to today. Each week has its own URL (`/en/calendar/2026-09-20`); `/en/calendar` is the current week.
- **Filters:** currencies, impact levels, search by event name. Currency and impact choices are remembered (cookie, so the server renders the filtered list — no layout shift after load); search is not remembered. Later: synced with the extension via the account.
- **Range:** same rule as the extension — free window is 21 days back to 30 days ahead of today. Weeks outside it show a Premium note instead of data and are never fetched. The window also protects the API: crawlers cannot make the server fetch arbitrary historical weeks from Forex Factory.

Inherits DESIGN.md v1 (chart-native world, fixed rem type for Operate, impact = flag shape + label, outcome = icon + name).

Structure:
- Heading row: "Economic calendar" + the week range; week navigation and Today beside it.
- Toolbar (sticky under the header): currency toggles, impact toggles, search. Filter state is visible and resettable.
- Days grouped in the visitor's timezone (timezone shown). Today's group is marked; a *Now* rule sits between released and upcoming events; the next release shows a countdown.
- Desktop: table (time, impact, currency, event, actual, forecast, previous). Narrow screens: stacked rows (time + impact + currency on one line, event, then values).
- States: loading is server-rendered (no spinner); API down → message; no events after filtering → message + reset; week outside the window → Premium note.

Indexing: `/calendar` (current week) is in the sitemap; other week URLs are `noindex, follow`.

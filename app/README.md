# Red News — website (`app/`)

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4.
Product context for design work lives in [PRODUCT.md](PRODUCT.md).

## Run

```bash
cp .env.example .env.local
npm install
npm run dev        # http://localhost:3000 → redirects to /en
npm run build      # production build (also type-checks)
```

## Structure

| Path | What |
|---|---|
| `src/proxy.ts` | Adds the locale to URLs without one (`/` → `/en`), from a saved cookie or `Accept-Language` |
| `src/i18n/config.ts` | All 22 extension locales (name, direction, hreflang); `enabledLocales` controls what ships |
| `src/i18n/dictionaries/` | UI strings per locale; `en.json` defines the keys |
| `src/lib/seo.ts` | `pageMetadata()` — canonical, hreflang, Open Graph, Twitter, noindex |
| `src/lib/api.ts` | Typed client for the Red News API (`server/`) |
| `src/app/[lang]/` | Pages; the locale is a root param (`next/root-params`) |
| `src/app/sitemap.ts`, `robots.ts` | Sitemap with hreflang alternates; robots blocks indexing unless `NEXT_PUBLIC_ALLOW_INDEXING=true` |
| `src/components/theme*.tsx` | No-flash light/dark theme: follows the OS until the user chooses |

## Adding a language

1. Add `src/i18n/dictionaries/<locale>.json` with the same keys as `en.json`.
2. Register it in `src/i18n/dictionaries.ts`.
3. Add the locale to `enabledLocales` in `src/i18n/config.ts`.

Sitemap, hreflang and routing pick it up automatically.

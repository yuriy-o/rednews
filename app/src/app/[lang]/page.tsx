import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { getDictionary, getLocale } from '@/i18n/dictionaries';
import { localePath, pageMetadata } from '@/lib/seo';
import { calendarApi, type CalendarEvent } from '@/lib/api';
import { illustrativePricePath } from '@/lib/price-path';
import { CHROME_STORE_URL } from '@/components/site-header';
import { WeekChart, type NewsLine } from '@/components/home/week-chart';
import { UpcomingList } from '@/components/home/upcoming-list';

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  // Home uses the full brand title rather than the "%s | Red News" template.
  const meta = pageMetadata({ locale, path: '/', ...dict.meta.home });
  return { ...meta, title: { absolute: `${dict.meta.siteName} — ${dict.meta.home.title}` } };
}

interface WeekData {
  events: CalendarEvent[] | null; // null when the API is cold-starting or down: the page still renders
  domain: [number, number];
}

async function loadWeek(): Promise<WeekData> {
  let events: CalendarEvent[] | null = null;
  try {
    events = (await calendarApi.week()).events;
  } catch {
    /* rendered without lines */
  }
  const nowSec = Math.floor(Date.now() / 1000);
  const first = events?.[0]?.ts ?? nowSec - 3 * 86400;
  const last = events?.[events.length - 1]?.ts ?? nowSec + 3 * 86400;
  const pad = (last - first) * 0.03;
  return { events, domain: [first - pad, last + pad] };
}

/** High-impact events grouped by release time — simultaneous releases share one line. */
function toNewsLines(events: CalendarEvent[]): NewsLine[] {
  const byTs = new Map<number, CalendarEvent[]>();
  for (const e of events) if (e.impact === 'HIGH') byTs.set(e.ts, [...(byTs.get(e.ts) ?? []), e]);
  return [...byTs].sort((a, b) => a[0] - b[0]).map(([ts, list]) => ({ ts, events: list }));
}

export default async function HomePage() {
  const [locale, dict, { events: week, domain }, upcoming] = await Promise.all([
    getLocale(),
    getDictionary(),
    loadWeek(),
    // Next 7 days, not the rest of this FF week: on a Friday the week has nothing left.
    calendarApi
      .upcoming({ impacts: ['HIGH', 'MEDIUM'] })
      .then((r) => r.events)
      .catch(() => null),
  ]);
  const t = dict.home;

  const events = week ?? [];
  const lines = toNewsLines(events);
  const path = illustrativePricePath(
    String(Math.floor(domain[0] / 604800)),
    lines.map((l) => (l.ts - domain[0]) / (domain[1] - domain[0])),
  );

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: dict.meta.siteName,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Chrome',
    description: dict.meta.home.description,
    installUrl: CHROME_STORE_URL,
    offers: [
      { '@type': 'Offer', name: t.plans.free.name, price: '0', priceCurrency: 'USD' },
      { '@type': 'Offer', name: t.plans.premium.name, price: '4.99', priceCurrency: 'USD' },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <section className="container hero">
        <h1 className="display hero__title">{t.title}</h1>
        <p className="lead hero__lead">{t.lead}</p>
        <div className="hero__chart">
          <WeekChart lines={lines} domain={domain} path={path} locale={locale} t={t.chart} />
          {!week && (
            <p className="hero__notice" role="status">
              {t.chart.unavailable}
            </p>
          )}
        </div>
        <p className="actions">
          <a className="button button--primary" href={CHROME_STORE_URL} target="_blank" rel="noopener">
            {t.cta}
          </a>
          <Link className="text-link" href={localePath(locale, '/calendar')}>
            {t.ctaSecondary}
            <ArrowRight size={16} strokeWidth={1.75} aria-hidden />
          </Link>
        </p>
      </section>

      <section className="container band split" aria-labelledby="features-title">
        <div className="split__intro">
          <h2 id="features-title" className="h2">
            {t.features.title}
          </h2>
          <p className="lead">{t.features.lead}</p>
        </div>
        <dl className="feature-list">
          {t.features.items.map((f) => (
            <div key={f.title} className="feature-list__row">
              <dt>{f.title}</dt>
              <dd>{f.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="container band" aria-labelledby="upcoming-title">
        <div className="band__head">
          <div>
            <h2 id="upcoming-title" className="h2">
              {t.upcoming.title}
            </h2>
            <p className="lead">{t.upcoming.lead}</p>
          </div>
          <Link className="text-link" href={localePath(locale, '/calendar')}>
            {t.upcoming.all}
            <ArrowRight size={16} strokeWidth={1.75} aria-hidden />
          </Link>
        </div>
        {upcoming ? (
          <UpcomingList events={upcoming} locale={locale} limit={6} t={t.upcoming} impactLabels={dict.calendar.impact} />
        ) : (
          <p className="lead">{t.chart.unavailable}</p>
        )}
      </section>

      <section className="container band" aria-labelledby="plans-title">
        <h2 id="plans-title" className="h2 plans__title">
          {t.plans.title}
        </h2>
        <div className="plans">
          {[t.plans.free, t.plans.premium].map((plan, i) => (
            <div key={plan.name} className="plans__plan" data-premium={i === 1 || undefined}>
              <h3 className="plans__name">{plan.name}</h3>
              <p className="plans__price">
                <span className="plans__amount">{plan.price}</span> <span className="plans__period">{plan.period}</span>
              </p>
              <ul className="plans__items">
                {plan.items.map((item) => (
                  <li key={item}>
                    <Check size={16} strokeWidth={2} aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="plans__foot">
          {t.plans.trial}{' '}
          <Link className="text-link" href={localePath(locale, '/pricing')}>
            {t.plans.more}
            <ArrowRight size={16} strokeWidth={1.75} aria-hidden />
          </Link>
        </p>
      </section>

      <section className="container band close" aria-labelledby="close-title">
        <h2 id="close-title" className="display close__title">
          {t.close.title}
        </h2>
        <p className="lead">{t.close.lead}</p>
        <p className="actions">
          <a className="button button--primary" href={CHROME_STORE_URL} target="_blank" rel="noopener">
            {t.cta}
          </a>
        </p>
      </section>
    </>
  );
}

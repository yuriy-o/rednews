import type { Metadata } from 'next';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { getDictionary, getLocale } from '@/i18n/dictionaries';
import { localePath, pageMetadata } from '@/lib/seo';
import { CHROME_STORE_URL } from '@/components/site-header';

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return pageMetadata({ locale, path: '/pricing', ...dict.meta.pricing });
}

export default async function PricingPage() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  const t = dict.pricing;
  const plans = dict.home.plans;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: dict.meta.siteName,
    description: dict.meta.pricing.description,
    offers: [
      {
        '@type': 'Offer',
        name: plans.free.name,
        price: '0',
        priceCurrency: 'USD',
      },
      {
        '@type': 'Offer',
        name: plans.premium.name,
        price: '4.99',
        priceCurrency: 'USD',
        priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <div className="container page">
        <div className="pricing-hero">
          <h1 id="pricing-title" className="display hero__title">
            {t.lead}
          </h1>
          <p className="lead">{t.intro}</p>
        </div>

        <section className="pricing-plans" aria-labelledby="pricing-title">
          <div className="plans">
            {/* Free Plan */}
            <div className="plans__plan">
              <h2 className="plans__name">{plans.free.name}</h2>
              <p className="plans__price">
                <span className="plans__amount">{plans.free.price}</span> <span className="plans__period">{plans.free.period}</span>
              </p>
              <ul className="plans__items">
                {plans.free.items.map((item, i) => (
                  <li key={i}>
                    <Check size={16} strokeWidth={2} aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="plans__foot">
                <a className="button" href={CHROME_STORE_URL} target="_blank" rel="noopener">
                  {t.ctaSecondary}
                </a>
              </div>
            </div>

            {/* Premium Plan */}
            <div className="plans__plan" data-premium>
              <div className="plans__trial">{t.trial}</div>
              <h2 className="plans__name">{plans.premium.name}</h2>
              <p className="plans__price">
                <span className="plans__amount">{plans.premium.price}</span> <span className="plans__period">{plans.premium.period}</span>
              </p>
              <ul className="plans__items">
                {plans.premium.items.map((item, i) => (
                  <li key={i}>
                    <Check size={16} strokeWidth={2} aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="plans__foot">
                <a className="button button--primary" href={CHROME_STORE_URL} target="_blank" rel="noopener">
                  {t.cta}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="band faq">
          <h2 className="h2">{t.faq}</h2>
          <div className="faq__items">
            {t.faqItems.map((item, i) => (
              <details key={i} className="faq__item">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getDictionary, getLocale } from '@/i18n/dictionaries';
import { pageMetadata } from '@/lib/seo';
import { localeDir } from '@/i18n/config';
import { CheckoutScreen } from '@/components/checkout/checkout-screen';

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return pageMetadata({ locale, path: '/checkout', title: dict.meta.checkout.title, noindex: true });
}

export default async function CheckoutPage() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return (
    <div className="container page checkout" dir={localeDir(locale)}>
      {/* useSearchParams (reads _ptxn/env/email) needs a Suspense boundary so the rest of the
          page isn't forced into full client-side rendering. */}
      <Suspense fallback={<p className="lead">{dict.checkout.opening}</p>}>
        <CheckoutScreen locale={locale} t={dict.checkout} />
      </Suspense>
    </div>
  );
}

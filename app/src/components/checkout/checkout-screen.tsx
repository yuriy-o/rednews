'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { useSearchParams } from 'next/navigation';
import type { Dictionary } from '@/i18n/dictionaries';

// Paddle's own JS SDK, loaded once this page mounts — see checkout() below for what it opens.
declare global {
  interface Window {
    Paddle?: {
      Environment: { set: (env: 'sandbox' | 'production') => void };
      Setup: (opts: { token: string }) => void;
      Checkout: {
        open: (opts: {
          transactionId: string;
          customer?: { email: string };
          settings: { displayMode: 'overlay'; successUrl: string };
        }) => void;
      };
    };
  }
}

// Paddle's client-side tokens are meant to run in the browser — not secrets, same class as a
// Stripe publishable key (see the Privacy Policy's Payments section and Paddle's own docs).
const PADDLE_TOKENS: Record<'sandbox' | 'production', string | undefined> = {
  sandbox: process.env.NEXT_PUBLIC_PADDLE_SANDBOX_TOKEN,
  production: process.env.NEXT_PUBLIC_PADDLE_PRODUCTION_TOKEN,
};

interface Props {
  locale: string;
  t: Dictionary['checkout'];
}

/**
 * Opens the Paddle overlay for the transaction the extension or account page created via the
 * paddle-checkout Edge Function — this page is exactly what that function's CHECKOUT_PAGE URL
 * (?_ptxn=&env=&email=) is meant to load. Not wired into the live redirect yet: CHECKOUT_PAGE
 * still points at the legacy static site (see STATUS.md) until that constant is updated.
 */
export function CheckoutScreen({ locale, t }: Props) {
  const params = useSearchParams();
  const [status, setStatus] = useState(t.opening);
  const [paddleReady, setPaddleReady] = useState(false);

  useEffect(() => {
    if (!paddleReady) return;
    const txn = params.get('_ptxn');
    if (!txn) {
      setStatus(t.missingReference);
      return;
    }
    const env = params.get('env') === 'sandbox' ? 'sandbox' : 'production';
    const email = params.get('email');
    try {
      const Paddle = window.Paddle!;
      Paddle.Environment.set(env);
      Paddle.Setup({ token: PADDLE_TOKENS[env] ?? '' });
      Paddle.Checkout.open({
        transactionId: txn,
        customer: email ? { email } : undefined,
        settings: {
          displayMode: 'overlay',
          successUrl: `${window.location.origin}/${locale}/thanks`,
        },
      });
    } catch (e) {
      setStatus(t.loadError.replace('{error}', e instanceof Error ? e.message : String(e)));
    }
  }, [paddleReady, params, locale, t]);

  return (
    <>
      <h1 className="h2">{t.title}</h1>
      <p className="lead" role="status">
        {status}
      </p>
      <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" onLoad={() => setPaddleReady(true)} />
    </>
  );
}

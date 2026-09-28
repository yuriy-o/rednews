'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Dictionary } from '@/i18n/dictionaries';
import { accountApi, supabase, type Entitlement, type TelegramStatus } from '@/lib/supabase';
import styles from './account-screen.module.css';

type Status = 'loading' | 'signed-out' | 'signed-in';
/** A plan/action request in flight, so a slow network can't double-submit a click. */
type Busy = 'signin' | 'signout' | 'trial' | 'checkout-monthly' | 'checkout-annual' | 'portal' | 'telegram' | null;

interface Props {
  locale: string;
  t: Dictionary['account'];
}

function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso));
}

export function AccountScreen({ locale, t }: Props) {
  const [status, setStatus] = useState<Status>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [entitlementReady, setEntitlementReady] = useState(false);
  const [telegram, setTelegram] = useState<TelegramStatus | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const isPremiumPlan = entitlement?.plan === 'trial' || entitlement?.plan === 'premium' || entitlement?.plan === 'comp';

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setStatus(data.session ? 'signed-in' : 'signed-out');
      }
      // The OAuth redirect lands with the session in the URL hash; supabase-js reads it but
      // doesn't clean up after itself, so it stays in the address bar and — worse — gets a
      // second one appended on the next sign-in, producing a URL with two #access_token runs.
      if (window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setStatus(next ? 'signed-in' : 'signed-out');
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setEntitlement(null);
      setEntitlementReady(false);
      return;
    }
    let active = true;
    setEntitlementReady(false);
    accountApi
      .entitlement(session.user.id)
      .then((e) => active && setEntitlement(e))
      .catch(() => active && setError(t.error))
      .finally(() => active && setEntitlementReady(true));
    return () => {
      active = false;
    };
  }, [session, t.error]);

  useEffect(() => {
    if (!session || !isPremiumPlan) {
      setTelegram(null);
      return;
    }
    let active = true;
    function load() {
      accountApi
        .telegramStatus()
        .then((r) => active && setTelegram(r.telegram))
        .catch(() => {
          /* Non-fatal: the connect button below just stays available. */
        });
    }
    load();
    // The user completes linking in a Telegram tab, not this one — no webhook reaches the
    // browser, so re-check status when they come back rather than polling in the background.
    function onVisible() {
      if (document.visibilityState === 'visible') load();
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [session, isPremiumPlan]);

  async function signIn() {
    setBusy('signin');
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Not `location.href`: any leftover #access_token from a previous session must not be
        // carried into the next redirect (see the hash-cleanup above).
        redirectTo: window.location.origin + window.location.pathname,
        // Always show Google's account chooser — without it, signing out and back in silently
        // reuses Google's own remembered session instead of letting the visitor pick a
        // different account (the extension supports switching accounts; the site should too).
        queryParams: { prompt: 'select_account' },
      },
    });
    if (err) {
      setError(t.error);
      setBusy(null);
    }
    // On success the browser navigates away to Google; no need to clear `busy`.
  }

  async function signOut() {
    setBusy('signout');
    await supabase.auth.signOut();
    setBusy(null);
  }

  async function startTrial() {
    setBusy('trial');
    setError(null);
    try {
      await accountApi.startTrial();
      if (session) setEntitlement(await accountApi.entitlement(session.user.id));
    } catch {
      setError(t.error);
    } finally {
      setBusy(null);
    }
  }

  async function upgrade(plan: 'monthly' | 'annual') {
    setBusy(plan === 'monthly' ? 'checkout-monthly' : 'checkout-annual');
    setError(null);
    try {
      const { url } = await accountApi.checkoutUrl(plan);
      window.open(url, '_blank', 'noopener');
    } catch {
      setError(t.error);
    } finally {
      setBusy(null);
    }
  }

  async function connectTelegram() {
    setBusy('telegram');
    setError(null);
    try {
      const { url } = await accountApi.telegramLinkToken();
      window.open(url, '_blank', 'noopener');
    } catch {
      setError(t.error);
    } finally {
      setBusy(null);
    }
  }

  async function manage() {
    setBusy('portal');
    setError(null);
    try {
      const { url } = await accountApi.portalUrl();
      window.open(url, '_blank', 'noopener');
    } catch {
      setError(t.error);
    } finally {
      setBusy(null);
    }
  }

  if (status === 'loading' || (status === 'signed-in' && !entitlementReady)) {
    return <p className={`lead ${styles.status}`}>{t.loading}</p>;
  }

  if (status === 'signed-out') {
    return (
      <div className={styles.panel}>
        <p className="lead">{t.lead}</p>
        <button className={`button button--primary ${styles.signIn}`} onClick={signIn} disabled={busy === 'signin'}>
          <GoogleMark />
          {busy === 'signin' ? t.signingIn : t.signIn}
        </button>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.connections}>
          <ConnectionRow label={t.telegram} value={t.premiumFeature} />
          <ConnectionRow label={t.ai} value={t.premiumFeature} />
        </div>
      </div>
    );
  }

  const plan = entitlement?.plan ?? 'free';
  const planLabel = t.plan[plan];

  return (
    <div className={styles.panel}>
      <p className={`data ${styles.email}`}>{session!.user.email}</p>
      <p className={styles.plan} data-premium={plan !== 'free' || undefined}>
        {planLabel}
      </p>
      {plan === 'trial' && entitlement?.trial_ends_at && (
        <p className={styles.meta}>{t.trialEnds.replace('{date}', formatDate(entitlement.trial_ends_at, locale))}</p>
      )}
      {plan === 'premium' && entitlement?.current_period_end && (
        <p className={styles.meta}>
          {(entitlement.status === 'canceled' ? t.endsOn : t.renewsOn).replace('{date}', formatDate(entitlement.current_period_end, locale))}
        </p>
      )}

      <div className={styles.actions}>
        {plan === 'free' && (
          <button className="button button--primary" onClick={startTrial} disabled={busy === 'trial'}>
            {busy === 'trial' ? t.startingTrial : t.startTrial}
          </button>
        )}
        {plan === 'free' && (
          <button className="button" onClick={() => upgrade('monthly')} disabled={busy === 'checkout-monthly'}>
            {busy === 'checkout-monthly' ? t.opening : t.upgrade}
          </button>
        )}
        {(plan === 'trial' || plan === 'premium') && entitlement?.paddle_customer_id && (
          <button className="button" onClick={manage} disabled={busy === 'portal'}>
            {busy === 'portal' ? t.opening : t.manage}
          </button>
        )}
        {plan === 'trial' && !entitlement?.paddle_customer_id && (
          <button className="button" onClick={() => upgrade('annual')} disabled={busy === 'checkout-annual'}>
            {busy === 'checkout-annual' ? t.opening : t.upgrade}
          </button>
        )}
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.connections}>
        <ConnectionRow
          label={t.telegram}
          value={
            !isPremiumPlan ? (
              t.premiumFeature
            ) : telegram?.linked ? (
              telegram.username ? `${t.telegramConnected} · @${telegram.username}` : t.telegramConnected
            ) : (
              <button className="button button--sm" onClick={connectTelegram} disabled={busy === 'telegram'}>
                {busy === 'telegram' ? t.telegramOpening : t.telegramConnect}
              </button>
            )
          }
        />
        <ConnectionRow label={t.ai} value={isPremiumPlan ? t.aiInExtension : t.premiumFeature} />
      </div>

      <button className={`button button--sm ${styles.signOut}`} onClick={signOut} disabled={busy === 'signout'}>
        {t.signOut}
      </button>
    </div>
  );
}

function ConnectionRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={styles.connectionRow}>
      <span className={styles.connectionLabel}>{label}</span>
      <div className={styles.connectionValue}>
        {typeof value === 'string' ? <span className={styles.connectionHint}>{value}</span> : value}
      </div>
    </div>
  );
}

/** Google's own "G" mark — required by their sign-in button branding guidelines. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.9v2.33A9 9 0 0 0 9 18Z"
      />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.03l3.05-2.33Z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.97l3.05 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}

// Browser Supabase client — same project the extension uses. Auth, entitlements (read-only,
// RLS-scoped to the signed-in user) and the account Edge Functions all go through this.
'use client';

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anonKey);

export interface Entitlement {
  plan: 'free' | 'trial' | 'premium' | 'comp';
  status: 'active' | 'expired' | 'canceled';
  trial_ends_at: string | null;
  current_period_end: string | null;
  paddle_customer_id: string | null;
}

/** Calls a Supabase Edge Function with the current session's bearer token. */
async function callFunction<T>(name: string, opts: { method?: string; query?: Record<string, string> } = {}): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('not_signed_in');

  const u = new URL(`${url}/functions/v1/${name}`);
  for (const [k, v] of Object.entries(opts.query ?? {})) u.searchParams.set(k, v);

  const res = await fetch(u, {
    method: opts.method ?? 'GET',
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `${name} → HTTP ${res.status}`);
  return body;
}

export interface TelegramStatus {
  linked: boolean;
  username: string | null;
}

export const accountApi = {
  entitlement: async (userId: string) => {
    const { data, error } = await supabase.from('entitlements').select('*').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data as Entitlement | null;
  },
  startTrial: () => callFunction<{ ok: true; plan: 'trial'; trial_ends_at: string }>('start-trial', { method: 'POST' }),
  checkoutUrl: (plan: 'monthly' | 'annual') => callFunction<{ url: string }>('paddle-checkout', { query: { plan } }),
  portalUrl: () => callFunction<{ url: string }>('paddle-portal', { method: 'POST' }),
  telegramLinkToken: () => callFunction<{ url: string; token: string; expires_at: string }>('tg-link-token'),
  // alert-prefs also returns notification prefs; the account page only needs connection status.
  telegramStatus: () => callFunction<{ telegram: TelegramStatus }>('alert-prefs'),
};

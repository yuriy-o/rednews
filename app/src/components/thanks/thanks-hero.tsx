'use client';

import { useEffect, useState } from 'react';
import { Crown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import styles from './thanks-hero.module.css';

interface Props {
  badge: string;
  titleGeneric: string;
  titleNamed: string;
}

function nameFromSession(user: { user_metadata?: Record<string, unknown>; email?: string } | undefined) {
  const meta = user?.user_metadata as { full_name?: string; name?: string } | undefined;
  const metaName = meta?.full_name || meta?.name;
  if (metaName) return metaName.split(' ')[0];
  if (user?.email) {
    const local = user.email.split('@')[0];
    return local.charAt(0).toUpperCase() + local.slice(1);
  }
  return null;
}

const CONFETTI_COLORS = ['var(--red-button)', 'var(--better)', 'var(--impact-medium)', 'var(--fg-faint)'];
const CONFETTI_PIECES = Array.from({ length: 24 }, (_, i) => i);

export function ThanksHero({ badge, titleGeneric, titleNamed }: Props) {
  const [title, setTitle] = useState(titleGeneric);

  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        const name = nameFromSession(data.session?.user);
        if (name) setTitle(titleNamed.replace('{name}', name));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [titleNamed]);

  return (
    <div className={styles.hero}>
      <div className={styles.confetti} aria-hidden>
        {CONFETTI_PIECES.map((i) => (
          <span
            key={i}
            className={styles.piece}
            style={{
              insetInlineStart: `${(i * 41) % 100}%`,
              animationDelay: `${(i % 8) * 70}ms`,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            }}
          />
        ))}
      </div>
      <div className={styles.badge}>
        <Crown size={20} strokeWidth={1.75} aria-hidden />
        <span>{badge}</span>
      </div>
      <h1 className="h2">{title}</h1>
    </div>
  );
}

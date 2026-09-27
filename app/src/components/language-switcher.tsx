'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Check, Globe } from 'lucide-react';
import { LOCALE_COOKIE, allLocales, enabledLocales, type Locale } from '@/i18n/config';

interface Props {
  locale: Locale;
  label: string;
  className?: string;
}

/**
 * A custom disclosure instead of a native <select>: the browser's own dropdown popup ignores
 * our theme (dark mode showed white options with a default-blue "selected" row, unstylable from
 * CSS). Matches the extension's own language menu — a compact code trigger ("EN") that opens a
 * list of native names — and MobileNav's existing disclosure pattern (Escape, outside click).
 * Hidden while only one locale is enabled — nothing to switch to yet.
 */
export function LanguageSwitcher({ locale, label, className }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !e.composedPath().includes(rootRef.current)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, [open]);

  if (enabledLocales.length <= 1) return null;

  function select(next: Locale) {
    setOpen(false);
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    // Swap only the leading /<locale> segment, keeping the rest of the path (same page, week, etc).
    const rest = pathname.replace(/^\/[^/]+/, '');
    router.push(`/${next}${rest}`);
  }

  const code = locale.split('-')[0].toUpperCase();

  return (
    <div ref={rootRef} className={`lang-switcher ${className ?? ''}`}>
      <button
        type="button"
        className="lang-switcher__trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        title={label}
        onClick={() => setOpen((v) => !v)}
      >
        <Globe size={16} strokeWidth={1.75} aria-hidden />
        <span aria-hidden>{code}</span>
      </button>
      <ul id={listId} className="lang-switcher__list" hidden={!open}>
        {enabledLocales.map((l) => (
          <li key={l}>
            <button type="button" aria-current={l === locale || undefined} onClick={() => select(l)}>
              <span>{allLocales[l].name}</span>
              {l === locale && <Check size={16} strokeWidth={2} className="lang-switcher__check" aria-hidden />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

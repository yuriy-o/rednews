'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Languages } from 'lucide-react';
import { LOCALE_COOKIE, allLocales, enabledLocales, type Locale } from '@/i18n/config';

interface Props {
  locale: Locale;
  label: string;
  className?: string;
}

/** Hidden while only one locale is enabled — nothing to switch to yet. */
export function LanguageSwitcher({ locale, label, className }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  if (enabledLocales.length <= 1) return null;

  function onChange(next: string) {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    // Swap only the leading /<locale> segment, keeping the rest of the path (same page, week, etc).
    const rest = pathname.replace(/^\/[^/]+/, '');
    router.push(`/${next}${rest}`);
  }

  return (
    <label className={className}>
      <Languages size={14} strokeWidth={1.75} aria-hidden />
      <span className="visually-hidden">{label}</span>
      <select value={locale} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {enabledLocales.map((l) => (
          <option key={l} value={l}>
            {allLocales[l].name}
          </option>
        ))}
      </select>
    </label>
  );
}

'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

import { THEME_STORAGE_KEY as STORAGE_KEY } from './theme-script';

type Theme = 'light' | 'dark';

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

const readTheme = (): Theme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

export function ThemeToggle({ label }: { label: string }) {
  // Server render has no theme; the icon appears after hydration without a mismatch.
  const theme = useSyncExternalStore(subscribe, readTheme, () => null);

  function toggle() {
    const next: Theme = readTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode — choice lasts for this page only */
    }
  }

  return (
    <button type="button" onClick={toggle} aria-label={label} title={label} className="icon-button">
      {theme === null ? null : theme === 'dark' ? (
        <Sun size={18} strokeWidth={1.75} aria-hidden />
      ) : (
        <Moon size={18} strokeWidth={1.75} aria-hidden />
      )}
    </button>
  );
}

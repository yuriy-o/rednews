'use client';

import { useLayoutEffect, useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

import { THEME_STORAGE_KEY as STORAGE_KEY } from './theme-script';

type Theme = 'light' | 'dark';

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

const readTheme = (): Theme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

/** Mirrors theme-script.tsx's pre-hydration logic — same resolution, kept in sync by hand since
 * that one has to stay a dependency-free inline string. */
function resolveTheme(): Theme {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    /* private mode */
  }
  if (saved === 'light' || saved === 'dark') return saved;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeToggle({ label }: { label: string }) {
  // Server render has no theme; the icon appears after hydration without a mismatch.
  const theme = useSyncExternalStore(subscribe, readTheme, () => null);

  // RootLayout sits at the [lang] segment — the app's actual root — so switching locale replaces
  // the whole <html> subtree instead of patching it, wiping data-theme/colorScheme (they were set
  // imperatively by theme-script.tsx's inline <script>, which only runs on a real document parse,
  // not this kind of client-side remount). Re-applying here on every mount closes that gap;
  // useLayoutEffect (not useEffect) so it lands before the browser paints the reset state.
  useLayoutEffect(() => {
    const next = resolveTheme();
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
  }, []);

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

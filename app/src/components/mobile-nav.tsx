'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from './theme';

interface Props {
  items: { href: string; label: string }[];
  openLabel: string;
  closeLabel: string;
  theme: { label: string; toggle: string };
}

/** Header navigation for narrow screens, where the inline nav is hidden. */
export function MobileNav({ items, openLabel, closeLabel, theme }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  // Close after navigating (the header persists across routes).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    // composedPath is captured at dispatch: toggling the theme swaps its icon, so by the time this
    // runs the clicked <svg> is detached and `contains(target)` would wrongly report an outside click.
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

  return (
    <div ref={rootRef} className="mobile-nav">
      <button
        type="button"
        className="icon-button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={open ? closeLabel : openLabel}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X size={18} strokeWidth={1.75} aria-hidden /> : <Menu size={18} strokeWidth={1.75} aria-hidden />}
      </button>
      <ul id={listId} className="mobile-nav__list" hidden={!open}>
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>
              {item.label}
            </Link>
          </li>
        ))}
        {/* On the narrowest screens the header's theme button lives here instead. */}
        <li className="mobile-nav__theme">
          <span>{theme.label}</span>
          <ThemeToggle label={theme.toggle} />
        </li>
      </ul>
    </div>
  );
}

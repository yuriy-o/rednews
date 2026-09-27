'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentProps } from 'react';

/** A nav `<Link>` that marks itself `aria-current="page"` when its href matches the route. */
export function NavLink({ href, ...rest }: ComponentProps<typeof Link>) {
  const pathname = usePathname();
  return <Link href={href} aria-current={pathname === href ? 'page' : undefined} {...rest} />;
}

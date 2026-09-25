import { lang } from 'next/root-params';
import { notFound } from 'next/navigation';
import { isEnabledLocale, type Locale } from './config';
import type en from './dictionaries/en.json';

export type Dictionary = typeof en;

// English is the source of truth for keys; other locales must match its shape.
const dictionaries: Partial<Record<Locale, () => Promise<Dictionary>>> = {
  en: () => import('./dictionaries/en.json').then((m) => m.default),
};

/** Current route's locale (from the `[lang]` root segment); 404 for unknown/disabled ones. */
export async function getLocale(): Promise<Locale> {
  const value = await lang();
  if (!isEnabledLocale(value)) notFound();
  return value;
}

export async function getDictionary(): Promise<Dictionary> {
  const load = dictionaries[await getLocale()];
  if (!load) notFound();
  return load();
}

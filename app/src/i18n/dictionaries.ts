import { lang } from 'next/root-params';
import { notFound } from 'next/navigation';
import { isEnabledLocale, type Locale } from './config';
import type en from './dictionaries/en.json';

export type Dictionary = typeof en;

// English is the source of truth for keys; other locales must match its shape.
const dictionaries: Partial<Record<Locale, () => Promise<Dictionary>>> = {
  en: () => import('./dictionaries/en.json').then((m) => m.default),
  uk: () => import('./dictionaries/uk.json').then((m) => m.default),
  es: () => import('./dictionaries/es.json').then((m) => m.default),
  'pt-br': () => import('./dictionaries/pt-br.json').then((m) => m.default),
  de: () => import('./dictionaries/de.json').then((m) => m.default),
  fr: () => import('./dictionaries/fr.json').then((m) => m.default),
  it: () => import('./dictionaries/it.json').then((m) => m.default),
  cs: () => import('./dictionaries/cs.json').then((m) => m.default),
  nl: () => import('./dictionaries/nl.json').then((m) => m.default),
  pl: () => import('./dictionaries/pl.json').then((m) => m.default),
  sk: () => import('./dictionaries/sk.json').then((m) => m.default),
  el: () => import('./dictionaries/el.json').then((m) => m.default),
  vi: () => import('./dictionaries/vi.json').then((m) => m.default),
  id: () => import('./dictionaries/id.json').then((m) => m.default),
  ms: () => import('./dictionaries/ms.json').then((m) => m.default),
  tr: () => import('./dictionaries/tr.json').then((m) => m.default),
  hi: () => import('./dictionaries/hi.json').then((m) => m.default),
  ja: () => import('./dictionaries/ja.json').then((m) => m.default),
  ko: () => import('./dictionaries/ko.json').then((m) => m.default),
  'zh-cn': () => import('./dictionaries/zh-cn.json').then((m) => m.default),
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

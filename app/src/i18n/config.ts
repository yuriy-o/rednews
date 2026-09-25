// All locales the extension ships. The URL segment is the lowercase BCP 47 tag; `hreflang`
// uses the canonical casing. Only `enabledLocales` are routable — enabling a language is
// adding its dictionary and listing it there.

export const allLocales = {
  en: { hreflang: 'en', name: 'English', dir: 'ltr' },
  ar: { hreflang: 'ar', name: 'العربية', dir: 'rtl' },
  cs: { hreflang: 'cs', name: 'Čeština', dir: 'ltr' },
  de: { hreflang: 'de', name: 'Deutsch', dir: 'ltr' },
  el: { hreflang: 'el', name: 'Ελληνικά', dir: 'ltr' },
  es: { hreflang: 'es', name: 'Español', dir: 'ltr' },
  fr: { hreflang: 'fr', name: 'Français', dir: 'ltr' },
  hi: { hreflang: 'hi', name: 'हिन्दी', dir: 'ltr' },
  id: { hreflang: 'id', name: 'Bahasa Indonesia', dir: 'ltr' },
  it: { hreflang: 'it', name: 'Italiano', dir: 'ltr' },
  ja: { hreflang: 'ja', name: '日本語', dir: 'ltr' },
  ko: { hreflang: 'ko', name: '한국어', dir: 'ltr' },
  ms: { hreflang: 'ms', name: 'Bahasa Melayu', dir: 'ltr' },
  nl: { hreflang: 'nl', name: 'Nederlands', dir: 'ltr' },
  pl: { hreflang: 'pl', name: 'Polski', dir: 'ltr' },
  'pt-br': { hreflang: 'pt-BR', name: 'Português (Brasil)', dir: 'ltr' },
  sk: { hreflang: 'sk', name: 'Slovenčina', dir: 'ltr' },
  tr: { hreflang: 'tr', name: 'Türkçe', dir: 'ltr' },
  uk: { hreflang: 'uk', name: 'Українська', dir: 'ltr' },
  ur: { hreflang: 'ur', name: 'اردو', dir: 'rtl' },
  vi: { hreflang: 'vi', name: 'Tiếng Việt', dir: 'ltr' },
  'zh-cn': { hreflang: 'zh-CN', name: '简体中文', dir: 'ltr' },
} as const;

export type Locale = keyof typeof allLocales;

export const defaultLocale: Locale = 'en';
export const enabledLocales: readonly Locale[] = ['en'];

export function isEnabledLocale(value: string): value is Locale {
  return (enabledLocales as readonly string[]).includes(value);
}

export const localeDir = (l: Locale) => allLocales[l].dir;
export const localeHreflang = (l: Locale) => allLocales[l].hreflang;

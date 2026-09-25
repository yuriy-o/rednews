import type { Metadata, Viewport } from 'next';
import { enabledLocales, localeDir } from '@/i18n/config';
import { getDictionary, getLocale } from '@/i18n/dictionaries';
import { siteUrl } from '@/lib/seo';
import { ThemeScript } from '@/components/theme-script';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { archivo } from '../fonts';
import '../globals.css';

export function generateStaticParams() {
  return enabledLocales.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    metadataBase: new URL(siteUrl),
    title: { default: `${dict.meta.siteName} — ${dict.meta.home.title}`, template: `%s | ${dict.meta.siteName}` },
    applicationName: dict.meta.siteName,
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1116' },
  ],
};

export default async function RootLayout({ children }: LayoutProps<'/[lang]'>) {
  const locale = await getLocale();
  const dict = await getDictionary();

  return (
    // data-theme is set by ThemeScript before hydration, hence the warning suppression.
    <html lang={locale} dir={localeDir(locale)} className={archivo.variable} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <a href="#main" className="skip-link">
          {dict.nav.skip}
        </a>
        <SiteHeader locale={locale} dict={dict} />
        <main id="main">{children}</main>
        <SiteFooter locale={locale} dict={dict} />
      </body>
    </html>
  );
}

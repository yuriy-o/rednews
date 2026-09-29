import type { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary, getLocale } from '@/i18n/dictionaries';
import { localePath, pageMetadata } from '@/lib/seo';
import { localeDir } from '@/i18n/config';
import { ThanksHero } from '@/components/thanks/thanks-hero';

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return pageMetadata({ locale, path: '/thanks', title: dict.meta.thanks.title, noindex: true });
}

export default async function ThanksPage() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  const t = dict.thanks;
  return (
    // Like LegalPage, dict.thanks is English-only today (see STATUS.md) — dir follows the
    // locale anyway so ar/ur read right-to-left as soon as real translations land, not just
    // whenever someone remembers to flip this.
    <div className="container page thanks" dir={localeDir(locale)}>
      <ThanksHero badge={t.badge} titleGeneric={t.titleGeneric} titleNamed={t.titleNamed} />
      <p className="lead">{t.body}</p>
      <p className="thanks__community">{t.community}</p>
      <p className="lead">{t.instruction}</p>
      <p className="actions">
        <Link className="button button--primary" href={localePath(locale)}>
          {t.back}
        </Link>
      </p>
      <p className="thanks__help">
        {t.help}{' '}
        <a href="mailto:support@rednews.app">support@rednews.app</a>
        <span aria-hidden> · </span>
        <a href="https://discord.com/users/1172891214580830322" target="_blank" rel="noopener noreferrer">
          Discord
        </a>
      </p>
    </div>
  );
}

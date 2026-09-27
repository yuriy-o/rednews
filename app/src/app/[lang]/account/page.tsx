import type { Metadata } from 'next';
import { getDictionary, getLocale } from '@/i18n/dictionaries';
import { pageMetadata } from '@/lib/seo';
import { AccountScreen } from '@/components/account/account-screen';

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return pageMetadata({ locale, path: '/account', title: dict.meta.account.title, noindex: true });
}

export default async function AccountPage() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return (
    <div className="container page">
      <h1 className="h2">{dict.account.title}</h1>
      <AccountScreen locale={locale} t={dict.account} />
      <p className="account-note">{dict.account.settingsNote}</p>
    </div>
  );
}

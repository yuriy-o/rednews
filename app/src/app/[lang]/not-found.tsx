import Link from 'next/link';
import { getDictionary, getLocale } from '@/i18n/dictionaries';
import { localePath } from '@/lib/seo';

export default async function NotFound() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return (
    <div className="container page">
      <h1 className="h2">{dict.notFound.title}</h1>
      <p>
        <Link href={localePath(locale)}>{dict.notFound.back}</Link>
      </p>
    </div>
  );
}

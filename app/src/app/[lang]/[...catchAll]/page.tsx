import { notFound } from 'next/navigation';

// Any path under a locale that matches no real route lands here instead of Next's default
// (untranslated, unstyled) 404: without this catch-all, an unmatched path never reaches the
// [lang] layout tree at all, so `[lang]/not-found.tsx` — and the header/footer around it —
// never renders.
export default function CatchAll(): never {
  notFound();
}

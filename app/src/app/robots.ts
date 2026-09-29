import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';

// Preview deployments and the pre-launch subdomain must not compete with rednews.app in search:
// only the environment that sets NEXT_PUBLIC_ALLOW_INDEXING=true is crawlable.
export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_ALLOW_INDEXING !== 'true') {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    // $ anchors each pattern to the exact path — without it, robots.txt matching is a prefix
    // match, so `/*/account` would also block a future `/en/account-help` (AUDIT.md §5.4).
    rules: { userAgent: '*', allow: '/', disallow: ['/*/account$', '/*/checkout$', '/*/thanks$'] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

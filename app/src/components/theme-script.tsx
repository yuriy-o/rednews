// Same storage key as the legacy rednews.app site, so a saved choice survives the migration.
export const THEME_STORAGE_KEY = 'rn-theme';

export const TZ_COOKIE = 'rn-tz';

// Runs in <head> before first paint: a saved choice wins, otherwise follow the OS and keep
// following it live until the user picks explicitly. It also remembers the visitor's timezone
// in a cookie so later server renders show local times (no re-grouping after hydration).
// Must stay dependency-free and tiny.
const themeScript = `(function(){try{var k='${THEME_STORAGE_KEY}',d=document.documentElement,m=matchMedia('(prefers-color-scheme: dark)');function s(){var t=localStorage.getItem(k);d.dataset.theme=t==='light'||t==='dark'?t:(m.matches?'dark':'light');d.style.colorScheme=d.dataset.theme}s();m.addEventListener('change',s)}catch(e){}try{document.cookie='${TZ_COOKIE}='+encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)+';path=/;max-age=31536000;samesite=lax'}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}

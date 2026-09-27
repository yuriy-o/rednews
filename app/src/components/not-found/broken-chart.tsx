// Decorative 404 illustration: the same visual grammar as the home chart (illustrative price
// path, red news line + folder flag), but the price line simply stops at the flag — there is no
// data past this point, same as the real chart has none past "now". Static (no client JS): the
// path is deterministic, so server and client render identically.
import { illustrativePricePath } from '@/lib/price-path';
import styles from './broken-chart.module.css';

const GAP_AT = 0.62;

export function BrokenChart({ label }: { label: string }) {
  const points = illustrativePricePath('404-not-found', [GAP_AT], 220);
  const before = points.filter(([x]) => x <= GAP_AT - 0.01);
  const d = before.map(([x, y], i) => `${i ? 'L' : 'M'}${(x * 1000).toFixed(1)} ${(y * 100).toFixed(2)}`).join(' ');

  return (
    // Chart grammar reads left to right even in RTL locales (same rule as the home chart).
    <div className={styles.plot} dir="ltr" aria-hidden="true">
      <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className={styles.svg}>
        {[20, 40, 60, 80].map((y) => (
          <line key={y} x1="0" x2="1000" y1={y} y2={y} className={styles.grid} />
        ))}
        <path d={d} className={styles.price} />
      </svg>
      <div className={styles.line} style={{ insetInlineStart: `${GAP_AT * 100}%` }} />
      <div className={styles.flag} style={{ insetInlineStart: `${GAP_AT * 100}%` }}>
        <span className={styles.code}>404</span> <span className={styles.label}>{label}</span>
      </div>
    </div>
  );
}

import {
  Bell,
  Briefcase,
  ChartColumn,
  ChartLine,
  Landmark,
  Mic,
  Monitor,
  Send,
  TrendingUp,
  Volume2,
  type LucideIcon,
} from 'lucide-react';
import type { Dictionary } from '@/i18n/dictionaries';
import { CATEGORIES, KEY_EVENTS, type Topic } from '@/lib/topics';
import styles from './alert-strip.module.css';

// Illustrations in chart grammar for the features band (labelled as examples on the page).
// Facts mirror the extension: reminders default to 15 minutes before, up to three per release;
// channels are on-chart, desktop, sound and Telegram; seven currencies and four impact levels.

const SPAN_MIN = 80; // strip covers release−70 min … release+10 min
const RELEASE_AT = 70;
const REMINDERS = [60, 15];
const x = (minFromStart: number) => `${(minFromStart / SPAN_MIN) * 100}%`;

export function AlertStrip({ t }: { t: Dictionary['home']['alerts'] }) {
  const channels = [
    { icon: ChartLine, label: t.channels.chart },
    { icon: Monitor, label: t.channels.desktop },
    { icon: Volume2, label: t.channels.sound },
    { icon: Send, label: t.channels.telegram },
  ];

  return (
    <figure className={styles.figure}>
      <div className={styles.strip} dir="ltr" aria-hidden="true">
        <span className={styles.example}>{t.example}</span>
        {REMINDERS.map((m) => (
          <div
            key={m}
            className={styles.reminder}
            // Reminders close to the release open to the left so they never cover its line.
            data-side={m <= 30 ? 'left' : undefined}
            style={{ insetInlineStart: x(RELEASE_AT - m) }}
          >
            <span className={styles.bell}>
              <Bell size={13} strokeWidth={2} />
              {t.before.replace('{m}', String(m))}
            </span>
          </div>
        ))}
        <div className={styles.release} style={{ insetInlineStart: x(RELEASE_AT) }}>
          <span className={styles.flag}>
            <b>USD</b> {t.release}
          </span>
        </div>
        <div className={`${styles.axis} data`}>
          {[0, 20, 40, 60, 80].map((m) => (
            <span key={m} style={{ insetInlineStart: x(m) }}>
              {m === RELEASE_AT ? '' : `${m - RELEASE_AT > 0 ? '+' : ''}${m - RELEASE_AT}m`}
            </span>
          ))}
        </div>
      </div>
      <figcaption className={styles.caption}>
        <p>{t.caption}</p>
        <ul className={styles.channels}>
          {channels.map(({ icon: Icon, label }) => (
            <li key={label}>
              <Icon size={15} strokeWidth={1.75} aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}

const CURRENCIES = ['AUD', 'CAD', 'CHF', 'EUR', 'GBP', 'JPY', 'USD'];
const ON = new Set(['EUR', 'GBP', 'USD']);

const TOPIC_ICONS: Partial<Record<Topic, LucideIcon>> = {
  jobs: Briefcase,
  inflation: TrendingUp,
  banks: Landmark,
  growth: ChartColumn,
  speeches: Mic,
};
const TOPICS_ON = new Set<Topic>(['NFP', 'banks']);

export function FilterStrip({
  t,
  impacts,
  topics,
}: {
  t: Dictionary['home']['alerts'];
  impacts: Dictionary['calendar']['impact'];
  topics: Dictionary['calendar']['topics'];
}) {
  const levels = [
    { key: 'HIGH', on: true },
    { key: 'MEDIUM', on: true },
    { key: 'LOW', on: false },
    { key: 'HOLIDAY', on: false },
  ] as const;

  return (
    <figure className={styles.figure}>
      <div className={styles.filters} aria-hidden="true">
        <span className={styles.example}>{t.example}</span>
        <div className={styles.chips}>
          {CURRENCIES.map((c) => (
            <span key={c} className={styles.chip} data-on={ON.has(c) || undefined}>
              {c}
            </span>
          ))}
        </div>
        <div className={styles.chips}>
          {levels.map((l) => (
            <span key={l.key} className={styles.chip} data-on={l.on || undefined}>
              <span className={`impact impact--${l.key.toLowerCase()}`}>{impacts[l.key]}</span>
            </span>
          ))}
        </div>
        {/* Topics: unselected ones are neutral (they don't exclude), as in the extension. */}
        <div className={styles.chips}>
          {[KEY_EVENTS, CATEGORIES].map((group, gi) => (
            <span key={gi} className={styles.topicGroup}>
              {group.map((topic) => {
                const Icon = TOPIC_ICONS[topic];
                return (
                  <span key={topic} className={`${styles.chip} ${styles.topic}`} data-on={TOPICS_ON.has(topic) || undefined}>
                    {Icon && <Icon size={13} strokeWidth={1.75} />}
                    {topics[topic]}
                  </span>
                );
              })}
            </span>
          ))}
        </div>
      </div>
      <figcaption className={styles.caption}>
        <p>{t.filtersCaption}</p>
      </figcaption>
    </figure>
  );
}

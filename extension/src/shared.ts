// ============ TYPES ============

export type ImpactLevel = 'High' | 'Medium' | 'Low' | 'Holiday';
export type AlertDuration = 1 | 10 | 20 | 40 | 60;
export type LabelMode = 'full' | 'short' | 'none';
export type Currency = 'AUD' | 'CAD' | 'CHF' | 'EUR' | 'GBP' | 'JPY' | 'USD';
export type CurrencyMode = 'auto' | 'manual';

export interface NewsItem {
  id: string;
  title: string;
  date: number;
  impact: ImpactLevel;
  country?: Currency;
  forecast?: string;
  previous?: string;
  actual?: string;
}

export interface ChartView {
  startTime: number;
  endTime: number;
}

export interface AlertSettings {
  enabled: boolean;
  minutesBefore: AlertDuration;
  includeHigh: boolean;
  includeMedium: boolean;
  includeLow: boolean;
  includeFutureOnly?: boolean;
}

export interface ChartSettings {
  timezone: string;
  showHistory: boolean;
  showFuture: boolean;
  showNearby: boolean;
  nearbyHours: number;
  labelMode: LabelMode;
}

export interface RNSettings {
  enabled: boolean;
  impacts: Record<ImpactLevel, boolean>;
  currencyMode: CurrencyMode;
  currencies: Record<Currency, boolean>;
  labelMode: LabelMode;
  alertEnabled: boolean;
  alertMinutes: AlertDuration;
  timezone: string;
  colors: Record<ImpactLevel, string>;
  widths: Record<ImpactLevel, number>;
  showHistory: boolean;
  showFuture: boolean;
  nearbyHours: number;
}

export interface RNState {
  settings: ChartSettings;
  alerts: AlertSettings;
  selectedPaneId?: string;
}

export type ThrottledFn<T extends (...args: never[]) => unknown> = (
  ...args: Parameters<T>
) => void;

// ============ CONSTANTS ============

export const IMPACT_LEVELS: ReadonlyArray<ImpactLevel> = [
  'High',
  'Medium',
  'Low',
  'Holiday',
];

export const ALERT_DURATIONS: ReadonlyArray<AlertDuration> = [
  1, 10, 20, 40, 60,
];

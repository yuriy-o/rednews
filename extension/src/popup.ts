/**
 * Red News - Popup UI (runs in isolated world)
 * © 2026 Yuriy Orekhov. All rights reserved.
 *
 * Manages: settings, calendar picker, news feed, account, Telegram alerts
 */

import type { ImpactLevel, AlertDuration, LabelMode, Currency } from './shared';

// ============ TYPES ============

interface UIState {
  lang: string;
  theme: 'light' | 'dark' | 'auto';
  hideNews?: boolean;
  rateState?: 'hidden' | 'ask' | 'feedback';
}

interface CalendarState {
  base: Date;
  selStart: string | null;
  selEnd: string | null;
}

interface PopupSettings {
  enabled: boolean;
  impacts: Record<ImpactLevel, boolean>;
  currencyMode: 'auto' | 'manual';
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

interface AuthState {
  signedIn: boolean;
  email?: string;
  plan?: 'free' | 'premium';
  trialDaysLeft?: number;
}

interface FeedbackData {
  message: string;
  email: string;
}

interface TelegramState {
  connected: boolean;
  userId?: number;
  username?: string;
  chatId?: string;
  enabled: boolean;
  quietStart?: string;
  quietEnd?: string;
}

interface DOMElements {
  // Language/Theme
  btnLang: HTMLButtonElement | null;
  langMenu: HTMLDivElement | null;
  btnTheme: HTMLButtonElement | null;

  // Settings
  btnSettings: HTMLButtonElement | null;
  settingsPanel: HTMLDivElement | null;

  // Calendar
  btnCal: HTMLButtonElement | null;
  calPanel: HTMLDivElement | null;
  calMonths: HTMLDivElement | null;
  btnCalCancel: HTMLButtonElement | null;
  btnCalApply: HTMLButtonElement | null;

  // News List
  listPanel: HTMLDivElement | null;
  newsList: HTMLUListElement | null;
  fetchedAt: HTMLSpanElement | null;

  // Settings Controls
  enabled: HTMLInputElement | null;
  timezone: HTMLSelectElement | null;
  curAuto: HTMLInputElement | null;
  curGrid: HTMLDivElement | null;
  labelMode: HTMLSelectElement | null;
  fontSize: HTMLSelectElement | null;
  showHistory: HTMLInputElement | null;
  showFuture: HTMLInputElement | null;
  nearbyHours: HTMLInputElement | null;

  // Alert Settings
  alertEnabled: HTMLInputElement | null;
  alertSound: HTMLInputElement | null;
  alertDuration: HTMLSelectElement | null;
  alertPremiumNote: HTMLDivElement | null;

  // Buttons
  btnRefresh: HTMLButtonElement | null;
  btnClearLines: HTMLButtonElement | null;
  btnReset: HTMLButtonElement | null;

  // Feedback
  feedbackPanel: HTMLDivElement | null;
  fbMessage: HTMLTextAreaElement | null;
  fbEmail: HTMLInputElement | null;
  btnFeedbackSend: HTMLButtonElement | null;
  fbStatus: HTMLDivElement | null;

  // Auth
  authBar: HTMLDivElement | null;
  authSignedOut: HTMLDivElement | null;
  authSignedIn: HTMLDivElement | null;
  btnSignIn: HTMLButtonElement | null;
  btnSignOut: HTMLButtonElement | null;
  authEmail: HTMLSpanElement | null;
  authPlan: HTMLSpanElement | null;
  btnAccount: HTMLButtonElement | null;

  // Trial/Upgrade
  trialRow: HTMLDivElement | null;
  btnTrial: HTMLButtonElement | null;
  upgradeRow: HTMLDivElement | null;
  btnManage: HTMLButtonElement | null;

  // Telegram
  tgSection: HTMLDivElement | null;
  btnTgConnect: HTMLButtonElement | null;
  tgStatus: HTMLDivElement | null;
  tgEnabled: HTMLInputElement | null;
  tgQuietStart: HTMLInputElement | null;
  tgQuietEnd: HTMLInputElement | null;

  // Status
  statusBar: HTMLDivElement | null;
}

// ============ STATE ============

let ui: UIState = { lang: 'en', theme: 'auto' };
let settings: PopupSettings | null = null;
let auth: AuthState = { signedIn: false };
let telegram: TelegramState = { connected: false, enabled: false };
let calendar: CalendarState = {
  base: new Date(),
  selStart: null,
  selEnd: null,
};

let viewSettings = false;
let viewCal = false;

const el: DOMElements = {
  btnLang: null,
  langMenu: null,
  btnTheme: null,
  btnSettings: null,
  settingsPanel: null,
  btnCal: null,
  calPanel: null,
  calMonths: null,
  btnCalCancel: null,
  btnCalApply: null,
  listPanel: null,
  newsList: null,
  fetchedAt: null,
  enabled: null,
  timezone: null,
  curAuto: null,
  curGrid: null,
  labelMode: null,
  fontSize: null,
  showHistory: null,
  showFuture: null,
  nearbyHours: null,
  alertEnabled: null,
  alertSound: null,
  alertDuration: null,
  alertPremiumNote: null,
  btnRefresh: null,
  btnClearLines: null,
  btnReset: null,
  feedbackPanel: null,
  fbMessage: null,
  fbEmail: null,
  btnFeedbackSend: null,
  fbStatus: null,
  authBar: null,
  authSignedOut: null,
  authSignedIn: null,
  btnSignIn: null,
  btnSignOut: null,
  authEmail: null,
  authPlan: null,
  btnAccount: null,
  trialRow: null,
  btnTrial: null,
  upgradeRow: null,
  btnManage: null,
  tgSection: null,
  btnTgConnect: null,
  tgStatus: null,
  tgEnabled: null,
  tgQuietStart: null,
  tgQuietEnd: null,
  statusBar: null,
};

// ============ INITIALIZATION ============

async function boot(): Promise<void> {
  try {
    const stored = (await chrome.storage.local.get([
      'rnSettings',
      'rnUi',
      'rnAuthState',
      'rnTelegram',
    ])) as {
      rnSettings?: PopupSettings;
      rnUi?: UIState;
      rnAuthState?: AuthState;
      rnTelegram?: TelegramState;
    };

    if (stored.rnUi) {
      Object.assign(ui, stored.rnUi);
    }

    if (stored.rnSettings) {
      settings = stored.rnSettings;
    }

    if (stored.rnAuthState) {
      auth = stored.rnAuthState;
    }

    if (stored.rnTelegram) {
      telegram = stored.rnTelegram;
    }

    cacheElements();
    buildStatic();
    updateUI();
    bindEvents();

    console.log('Red News popup initialized');
  } catch (e) {
    console.error('Failed to boot popup:', e);
  }
}

function cacheElements(): void {
  const $ = (id: string) => document.getElementById(id) as HTMLElement | null;

  el.btnLang = $ ('btnLang') as HTMLButtonElement;
  el.langMenu = $('langMenu') as HTMLDivElement;
  el.btnTheme = $('btnTheme') as HTMLButtonElement;
  el.btnSettings = $('btnSettings') as HTMLButtonElement;
  el.settingsPanel = $('settingsPanel') as HTMLDivElement;
  el.btnCal = $('btnCal') as HTMLButtonElement;
  el.calPanel = $('calPanel') as HTMLDivElement;
  el.calMonths = $('calMonths') as HTMLDivElement;
  el.btnCalCancel = $('btnCalCancel') as HTMLButtonElement;
  el.btnCalApply = $('btnCalApply') as HTMLButtonElement;
  el.listPanel = $('listPanel') as HTMLDivElement;
  el.newsList = $('newsList') as HTMLUListElement;
  el.fetchedAt = $('fetchedAt') as HTMLSpanElement;
  el.enabled = $('enabled') as HTMLInputElement;
  el.timezone = $('timezone') as HTMLSelectElement;
  el.curAuto = $('curAuto') as HTMLInputElement;
  el.curGrid = $('curGrid') as HTMLDivElement;
  el.labelMode = $('labelMode') as HTMLSelectElement;
  el.fontSize = $('fontSize') as HTMLSelectElement;
  el.showHistory = $('showHistory') as HTMLInputElement;
  el.showFuture = $('showFuture') as HTMLInputElement;
  el.nearbyHours = $('nearbyHours') as HTMLInputElement;
  el.alertEnabled = $('alertEnabled') as HTMLInputElement;
  el.alertSound = $('alertSound') as HTMLInputElement;
  el.alertDuration = $('alertDuration') as HTMLSelectElement;
  el.alertPremiumNote = $('alertPremiumNote') as HTMLDivElement;
  el.btnRefresh = $('btnRefresh') as HTMLButtonElement;
  el.btnClearLines = $('btnClearLines') as HTMLButtonElement;
  el.btnReset = $('btnReset') as HTMLButtonElement;
  el.feedbackPanel = $('feedbackPanel') as HTMLDivElement;
  el.fbMessage = $('fbMessage') as HTMLTextAreaElement;
  el.fbEmail = $('fbEmail') as HTMLInputElement;
  el.btnFeedbackSend = $('btnFeedbackSend') as HTMLButtonElement;
  el.fbStatus = $('fbStatus') as HTMLDivElement;
  el.authBar = $('authBar') as HTMLDivElement;
  el.authSignedOut = $('authSignedOut') as HTMLDivElement;
  el.authSignedIn = $('authSignedIn') as HTMLDivElement;
  el.btnSignIn = $('btnSignIn') as HTMLButtonElement;
  el.btnSignOut = $('btnSignOut') as HTMLButtonElement;
  el.authEmail = $('authEmail') as HTMLSpanElement;
  el.authPlan = $('authPlan') as HTMLSpanElement;
  el.btnAccount = $('btnAccount') as HTMLButtonElement;
  el.trialRow = $('trialRow') as HTMLDivElement;
  el.btnTrial = $('btnTrial') as HTMLButtonElement;
  el.upgradeRow = $('upgradeRow') as HTMLDivElement;
  el.btnManage = $('btnManage') as HTMLButtonElement;
  el.tgSection = $('tgSection') as HTMLDivElement;
  el.btnTgConnect = $('btnTgConnect') as HTMLButtonElement;
  el.tgStatus = $('tgStatus') as HTMLDivElement;
  el.tgEnabled = $('tgEnabled') as HTMLInputElement;
  el.tgQuietStart = $('tgQuietStart') as HTMLInputElement;
  el.tgQuietEnd = $('tgQuietEnd') as HTMLInputElement;
  el.statusBar = $('statusBar') as HTMLDivElement;
}

function buildStatic(): void {
  // TODO: Build currency checkboxes
  // TODO: Build language menu
  // TODO: Build calendar UI
}

function updateUI(): void {
  // TODO: Sync UI state with settings
  // TODO: Update auth display
  // TODO: Update telegram status
}

function bindEvents(): void {
  // TODO: Bind all event listeners
}

// ============ PLACEHOLDER FUNCTIONS ============

function saveSetting(key: string, value: unknown): void {
  if (!settings) return;
  console.log(`Save ${key}:`, value);
  chrome.storage.local.set({ rnSettings: settings });
}

function loadNews(): void {
  if (!el.newsList) return;
  console.log('Load news');
}

function onRefresh(): void {
  console.log('Refresh news');
}

function onSignIn(): void {
  console.log('Sign in');
}

function onFeedbackSend(): void {
  console.log('Send feedback');
}

function onTgConnect(): void {
  console.log('Connect Telegram');
}

// ============ STARTUP ============

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

export {};

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
  if (!el.curGrid) return;

  const currencies: Currency[] = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF'];

  el.curGrid.innerHTML = '';
  currencies.forEach((cur) => {
    const label = document.createElement('label');
    label.className = 'row';
    label.innerHTML = `<input type="checkbox" data-cur="${cur}"> ${cur}`;
    el.curGrid!.appendChild(label);
  });
}

function updateUI(): void {
  if (!settings) return;

  // Enabled state
  if (el.enabled) {
    el.enabled.checked = settings.enabled;
  }

  // Timezone
  if (el.timezone) {
    el.timezone.value = settings.timezone;
  }

  // Currency mode
  if (el.curAuto) {
    el.curAuto.checked = settings.currencyMode === 'auto';
  }

  // Currency checkboxes
  document.querySelectorAll('[data-cur]').forEach((checkbox) => {
    const cur = (checkbox as HTMLInputElement).dataset.cur as Currency;
    (checkbox as HTMLInputElement).checked = settings!.currencies[cur] ?? false;
  });

  // Label/Font settings
  if (el.labelMode) {
    el.labelMode.value = settings.labelMode;
  }

  if (el.fontSize) {
    el.fontSize.value = String(settings.widths.High || 2);
  }

  // History/Future
  if (el.showHistory) {
    el.showHistory.checked = settings.showHistory;
  }

  if (el.showFuture) {
    el.showFuture.checked = settings.showFuture;
  }

  if (el.nearbyHours) {
    el.nearbyHours.value = String(settings.nearbyHours);
  }

  // Alert settings
  if (el.alertEnabled) {
    el.alertEnabled.checked = settings.alertEnabled;
  }

  if (el.alertDuration) {
    el.alertDuration.value = String(settings.alertMinutes);
  }

  // Auth display
  if (el.authSignedOut && el.authSignedIn) {
    el.authSignedOut.style.display = auth.signedIn ? 'none' : 'block';
    el.authSignedIn.style.display = auth.signedIn ? 'block' : 'none';
  }

  if (auth.signedIn && el.authEmail) {
    el.authEmail.textContent = auth.email || '';
  }

  if (auth.signedIn && el.authPlan) {
    el.authPlan.textContent = auth.plan === 'premium' ? 'Premium' : 'Free';
  }

  // Trial/Upgrade rows
  if (el.trialRow) {
    el.trialRow.style.display = auth.signedIn && auth.trialDaysLeft ? 'block' : 'none';
  }

  if (el.upgradeRow) {
    el.upgradeRow.style.display =
      auth.signedIn && auth.plan !== 'premium' ? 'block' : 'none';
  }

  // Telegram status
  if (el.tgStatus) {
    el.tgStatus.textContent = telegram.connected
      ? `Connected as @${telegram.username}`
      : 'Not connected';
  }

  if (el.tgEnabled) {
    el.tgEnabled.checked = telegram.enabled;
  }
}

function bindEvents(): void {
  // Language selector
  el.btnLang?.addEventListener('click', () => {
    if (el.langMenu) {
      el.langMenu.style.display = el.langMenu.style.display === 'none' ? 'block' : 'none';
    }
  });

  // Theme toggle
  el.btnTheme?.addEventListener('click', () => {
    const newTheme = ui.theme === 'light' ? 'dark' : ui.theme === 'dark' ? 'auto' : 'light';
    ui.theme = newTheme;
    applyTheme();
    chrome.storage.local.set({ rnUi: ui });
  });

  // Settings panel toggle
  el.btnSettings?.addEventListener('click', () => {
    viewSettings = !viewSettings;
    if (el.settingsPanel) {
      el.settingsPanel.style.display = viewSettings ? 'block' : 'none';
    }
  });

  // Enabled checkbox
  el.enabled?.addEventListener('change', (e) => {
    if (!settings) return;
    settings.enabled = (e.target as HTMLInputElement).checked;
    saveSetting('enabled', settings.enabled);
  });

  // Timezone selector
  el.timezone?.addEventListener('change', (e) => {
    if (!settings) return;
    settings.timezone = (e.target as HTMLSelectElement).value;
    saveSetting('timezone', settings.timezone);
  });

  // Currency mode auto/manual
  el.curAuto?.addEventListener('change', (e) => {
    if (!settings) return;
    settings.currencyMode = (e.target as HTMLInputElement).checked ? 'auto' : 'manual';
    saveSetting('currencyMode', settings.currencyMode);
  });

  // Currency checkboxes
  document.querySelectorAll('[data-cur]').forEach((checkbox) => {
    (checkbox as HTMLInputElement).addEventListener('change', (e) => {
      if (!settings) return;
      const cur = (e.target as HTMLInputElement).dataset.cur as Currency;
      settings.currencies[cur] = (e.target as HTMLInputElement).checked;
      saveSetting('currencies', settings.currencies);
    });
  });

  // Label mode
  el.labelMode?.addEventListener('change', (e) => {
    if (!settings) return;
    settings.labelMode = (e.target as HTMLSelectElement).value as LabelMode;
    saveSetting('labelMode', settings.labelMode);
  });

  // Show history/future
  el.showHistory?.addEventListener('change', (e) => {
    if (!settings) return;
    settings.showHistory = (e.target as HTMLInputElement).checked;
    saveSetting('showHistory', settings.showHistory);
  });

  el.showFuture?.addEventListener('change', (e) => {
    if (!settings) return;
    settings.showFuture = (e.target as HTMLInputElement).checked;
    saveSetting('showFuture', settings.showFuture);
  });

  el.nearbyHours?.addEventListener('change', (e) => {
    if (!settings) return;
    settings.nearbyHours = parseInt((e.target as HTMLInputElement).value, 10);
    saveSetting('nearbyHours', settings.nearbyHours);
  });

  // Alert settings
  el.alertEnabled?.addEventListener('change', (e) => {
    if (!settings) return;
    settings.alertEnabled = (e.target as HTMLInputElement).checked;
    saveSetting('alertEnabled', settings.alertEnabled);
  });

  el.alertDuration?.addEventListener('change', (e) => {
    if (!settings) return;
    settings.alertMinutes = parseInt(
      (e.target as HTMLSelectElement).value,
      10
    ) as AlertDuration;
    saveSetting('alertMinutes', settings.alertMinutes);
  });

  // Buttons
  el.btnRefresh?.addEventListener('click', onRefresh);
  el.btnClearLines?.addEventListener('click', onClearLines);
  el.btnReset?.addEventListener('click', onReset);

  // Auth buttons
  el.btnSignIn?.addEventListener('click', onSignIn);
  el.btnSignOut?.addEventListener('click', onSignOut);
  el.btnTrial?.addEventListener('click', onStartTrial);
  el.btnManage?.addEventListener('click', onManageAccount);

  // Feedback
  el.btnFeedbackSend?.addEventListener('click', onFeedbackSend);

  // Telegram
  el.btnTgConnect?.addEventListener('click', onTgConnect);
  el.tgEnabled?.addEventListener('change', onTgToggle);
}

// ============ HELPER FUNCTIONS ============

function saveSetting(key: string, value: unknown): void {
  if (!settings) return;
  chrome.storage.local.set({ rnSettings: settings });
  chrome.runtime.sendMessage({
    type: 'RN_SETTINGS_CHANGED',
    settings,
  }).catch(() => {
    // Background may not be available
  });
}

function applyTheme(): void {
  const isDark = ui.theme === 'dark' ||
    (ui.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
}

function loadNews(): void {
  if (!el.newsList) return;
  el.newsList.innerHTML = '<li style="opacity: 0.5;">Loading news...</li>';

  chrome.runtime.sendMessage({ type: 'RN_GET_NEWS' }, (response) => {
    if (!el.newsList) return;
    el.newsList.innerHTML = '';

    const news = response.news || [];
    if (news.length === 0) {
      el.newsList.innerHTML = '<li style="opacity: 0.5;">No news today</li>';
      return;
    }

    news.slice(0, 20).forEach((item: { ts: number; title: string; country: string; impact: string }) => {
      const li = document.createElement('li');
      li.textContent = `${item.country} ${item.impact}: ${item.title}`;
      el.newsList!.appendChild(li);
    });
  });
}

// ============ EVENT HANDLERS ============

function onRefresh(): void {
  loadNews();
  chrome.runtime.sendMessage({ type: 'RN_REFRESH_NEWS' });
}

function onClearLines(): void {
  if (!confirm('Clear all drawn lines?')) return;
  chrome.runtime.sendMessage({ type: 'RN_CLEAR_LINES' });
}

function onReset(): void {
  if (!confirm('Reset all settings to defaults?')) return;
  chrome.storage.local.remove(['rnSettings', 'rnUi', 'rnAuthState']);
  window.location.reload();
}

function onSignIn(): void {
  chrome.runtime.sendMessage({ type: 'RN_AUTH_SIGNIN' });
}

function onSignOut(): void {
  if (!confirm('Sign out?')) return;
  auth = { signedIn: false };
  chrome.storage.local.set({ rnAuthState: auth });
  updateUI();
}

function onStartTrial(): void {
  chrome.runtime.sendMessage({ type: 'RN_START_TRIAL' });
}

function onManageAccount(): void {
  chrome.runtime.sendMessage({ type: 'RN_MANAGE_ACCOUNT' });
}

async function onFeedbackSend(): Promise<void> {
  if (!el.fbMessage || !el.fbEmail) return;

  const msg = el.fbMessage.value.trim();
  const email = el.fbEmail.value.trim();

  if (!msg || !email) {
    alert('Please fill in all fields');
    return;
  }

  try {
    await chrome.runtime.sendMessage({
      type: 'RN_SEND_FEEDBACK',
      message: msg,
      email,
    });

    if (el.fbStatus) {
      el.fbStatus.textContent = 'Feedback sent ✓';
      el.fbStatus.style.color = 'green';
    }

    el.fbMessage.value = '';
    el.fbEmail.value = '';

    setTimeout(() => {
      if (el.fbStatus) {
        el.fbStatus.textContent = '';
      }
    }, 3000);
  } catch (e) {
    if (el.fbStatus) {
      el.fbStatus.textContent = 'Failed to send feedback';
      el.fbStatus.style.color = 'red';
    }
  }
}

function onTgConnect(): void {
  chrome.runtime.sendMessage({ type: 'RN_TG_START_LOGIN' });
}

function onTgToggle(e: Event): void {
  telegram.enabled = (e.target as HTMLInputElement).checked;
  chrome.storage.local.set({ rnTelegram: telegram });
}

// ============ STARTUP ============

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

export {};

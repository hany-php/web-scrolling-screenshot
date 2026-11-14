export type TextDirection = 'rtl' | 'ltr';

export function getUiLanguage(): string {
  if (typeof chrome !== 'undefined' && typeof chrome.i18n.getUILanguage === 'function') {
    return chrome.i18n.getUILanguage();
  }
  return 'en';
}

export function getTextDirection(locale: string = getUiLanguage()): TextDirection {
  return locale.toLowerCase().startsWith('ar') ? 'rtl' : 'ltr';
}

export function t(key: string, fallback: string = key): string {
  if (typeof chrome !== 'undefined' && typeof chrome.i18n.getMessage === 'function') {
    const value = chrome.i18n.getMessage(key);
    if (value.length > 0) {
      return value;
    }
  }
  return fallback;
}

export function applyDocumentDirection(locale: string = getUiLanguage()): TextDirection {
  const dir = getTextDirection(locale);
  if (typeof document !== 'undefined') {
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }
  return dir;
}

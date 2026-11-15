import type { UiLocalePreference } from '../shared/preferences';
import { AR_CATALOG, type CatalogEntry, EN_CATALOG } from './catalogs';

export type TextDirection = 'rtl' | 'ltr';

let preferredLocale: UiLocalePreference = 'auto';

export function getUiLanguage(): string {
  if (preferredLocale === 'ar' || preferredLocale === 'en') {
    return preferredLocale;
  }
  if (typeof chrome !== 'undefined' && typeof chrome.i18n.getUILanguage === 'function') {
    return chrome.i18n.getUILanguage();
  }
  return 'en';
}

export function getEffectiveLocale(): 'ar' | 'en' {
  return getUiLanguage().toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

export function setPreferredLocale(locale: UiLocalePreference): void {
  preferredLocale = locale;
}

export function getTextDirection(locale: string = getUiLanguage()): TextDirection {
  return locale.toLowerCase().startsWith('ar') ? 'rtl' : 'ltr';
}

function formatCatalogMessage(
  entry: CatalogEntry,
  substitutions?: string | readonly string[],
): string {
  if (!entry.placeholders || entry.placeholders.length === 0 || substitutions === undefined) {
    return entry.message;
  }
  const values = typeof substitutions === 'string' ? [substitutions] : [...substitutions];
  let result = entry.message;
  entry.placeholders.forEach((placeholderName, idx) => {
    const replacement = values[idx] ?? '';
    result = result.replaceAll(`$${placeholderName}$`, replacement);
  });
  return result;
}

export function t(
  key: string,
  fallback: string = key,
  substitutions?: string | readonly string[],
): string {
  if (
    preferredLocale === 'auto' &&
    typeof chrome !== 'undefined' &&
    typeof chrome.i18n.getMessage === 'function'
  ) {
    const subs =
      substitutions === undefined
        ? undefined
        : typeof substitutions === 'string'
          ? substitutions
          : [...substitutions];
    const value = chrome.i18n.getMessage(key, subs);
    if (value.length > 0) {
      return value;
    }
  }

  const catalog = getEffectiveLocale() === 'ar' ? AR_CATALOG : EN_CATALOG;
  const entry = catalog[key];
  if (entry) {
    return formatCatalogMessage(entry, substitutions);
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

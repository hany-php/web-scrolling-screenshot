import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { AR_CATALOG, EN_CATALOG } from '../../src/i18n/catalogs';
import { getTextDirection, setPreferredLocale, t } from '../../src/i18n/messages';

interface RawChromeLocaleEntry {
  readonly message: string;
  readonly placeholders?: Record<string, { readonly content: string }>;
}

function readLocaleFile(locale: 'en' | 'ar'): Record<string, RawChromeLocaleEntry> {
  const filePath = path.resolve(process.cwd(), 'public', '_locales', locale, 'messages.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, RawChromeLocaleEntry>;
}

describe('i18n catalogs & RTL direction', () => {
  afterEach(() => {
    setPreferredLocale('auto');
  });

  it('maps Arabic locales to rtl and others to ltr', () => {
    expect(getTextDirection('ar')).toBe('rtl');
    expect(getTextDirection('ar-EG')).toBe('rtl');
    expect(getTextDirection('AR_SA')).toBe('rtl');
    expect(getTextDirection('en')).toBe('ltr');
    expect(getTextDirection('en-US')).toBe('ltr');
  });

  it('keeps 100% key and message parity across public/_locales and runtime catalogs', () => {
    const enJson = readLocaleFile('en');
    const arJson = readLocaleFile('ar');

    const enKeys = Object.keys(enJson).sort();
    const arKeys = Object.keys(arJson).sort();
    expect(arKeys).toEqual(enKeys);
    expect(Object.keys(EN_CATALOG).sort()).toEqual(enKeys);
    expect(Object.keys(AR_CATALOG).sort()).toEqual(enKeys);

    for (const key of enKeys) {
      expect(enJson[key]?.message.trim().length).toBeGreaterThan(0);
      expect(arJson[key]?.message.trim().length).toBeGreaterThan(0);
      expect(EN_CATALOG[key]?.message).toBe(enJson[key]?.message);
      expect(AR_CATALOG[key]?.message).toBe(arJson[key]?.message);
    }
  });

  it('supports runtime locale switching with placeholders between English and Arabic', () => {
    setPreferredLocale('ar');
    expect(t('popup_title')).toBe('تصوير صفحات الويب');
    expect(t('preview_parts_badge', '', ['3'])).toBe('3 أجزاء');
    expect(t('popup_status_capturing', '', ['2', '5'])).toContain('2 من 5');

    setPreferredLocale('en');
    expect(t('popup_title')).toBe('Web Scrolling Screenshot');
    expect(t('preview_parts_badge', '', ['3'])).toBe('3 parts');
    expect(t('popup_status_capturing', '', ['2', '5'])).toContain('2 / 5');
  });
});

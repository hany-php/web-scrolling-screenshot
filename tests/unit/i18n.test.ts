import { describe, expect, it } from 'vitest';
import { getTextDirection } from '../../src/i18n/messages';

describe('getTextDirection', () => {
  it('maps Arabic locales to rtl and others to ltr', () => {
    expect(getTextDirection('ar')).toBe('rtl');
    expect(getTextDirection('ar-EG')).toBe('rtl');
    expect(getTextDirection('AR_SA')).toBe('rtl');
    expect(getTextDirection('en')).toBe('ltr');
    expect(getTextDirection('en-US')).toBe('ltr');
  });
});

import { describe, expect, it } from 'vitest';
import { isRestrictedPageUrl } from '../../src/capture/restricted-url';

describe('isRestrictedPageUrl', () => {
  it('allows normal http, https, and file URLs', () => {
    expect(isRestrictedPageUrl('https://example.com/docs')).toBe(false);
    expect(isRestrictedPageUrl('http://localhost:4173/tall-page.html')).toBe(false);
    expect(isRestrictedPageUrl('file:///tmp/test.html')).toBe(false);
  });

  it('flags internal browser and webstore URLs as restricted', () => {
    expect(isRestrictedPageUrl(undefined)).toBe(true);
    expect(isRestrictedPageUrl('chrome://extensions')).toBe(true);
    expect(isRestrictedPageUrl('edge://settings')).toBe(true);
    expect(isRestrictedPageUrl('about:blank')).toBe(true);
    expect(isRestrictedPageUrl('https://chromewebstore.google.com/detail/foo')).toBe(true);
    expect(isRestrictedPageUrl('https://chrome.google.com/webstore/category/extensions')).toBe(
      true,
    );
  });
});

import { describe, expect, it } from 'vitest';
import { formatScreenshotFilename, sanitizeHostnameSlug } from '../../src/stitcher/filename';

describe('sanitizeHostnameSlug', () => {
  it('sanitizes unsafe path characters and normalizes dots', () => {
    expect(sanitizeHostnameSlug('docs.example.com')).toBe('docs-example-com');
    expect(sanitizeHostnameSlug('../../../etc/passwd')).toBe('etc-passwd');
    expect(sanitizeHostnameSlug('   ')).toBe('capture');
  });
});

describe('formatScreenshotFilename', () => {
  it('formats single and multi-part filenames cleanly', () => {
    const date = new Date(2026, 10, 14, 22, 30, 5);
    expect(
      formatScreenshotFilename({
        hostname: 'example.com',
        date,
        format: 'png',
      }),
    ).toBe('screenshot-example-com-20261114-223005.png');

    expect(
      formatScreenshotFilename({
        hostname: 'example.com',
        date,
        partIndex: 1,
        totalParts: 3,
        format: 'jpeg',
      }),
    ).toBe('screenshot-example-com-20261114-223005-part-2of3.jpg');
  });
});

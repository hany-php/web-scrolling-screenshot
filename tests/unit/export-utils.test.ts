import { describe, expect, it } from 'vitest';

import { normalizeExportPreferences } from '../../src/shared/preferences';
import {
  clampQualityPercent,
  computeFitZoom,
  formatDimensionsSummary,
  formatFileSize,
  mimeTypeForFormat,
  qualityPercentToFloat,
  stepZoom,
} from '../../src/stitcher/export-utils';

describe('export-utils & preferences', () => {
  it('clamps quality percentages between 60% and 100%', () => {
    expect(clampQualityPercent(25)).toBe(60);
    expect(clampQualityPercent(60)).toBe(60);
    expect(clampQualityPercent(87.6)).toBe(88);
    expect(clampQualityPercent(140)).toBe(100);
    expect(clampQualityPercent(Number.NaN)).toBe(92);
    expect(qualityPercentToFloat(85)).toBeCloseTo(0.85, 5);
  });

  it('maps formats to valid MIME types and formats human-readable file sizes', () => {
    expect(mimeTypeForFormat('png')).toBe('image/png');
    expect(mimeTypeForFormat('jpeg')).toBe('image/jpeg');
    expect(mimeTypeForFormat('webp')).toBe('image/webp');

    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.50 MB');
  });

  it('formats dimension + DPR badges and computes Fit / step zoom ratios', () => {
    expect(formatDimensionsSummary(1920, 6400, 2)).toBe('1920 × 6400 px · 2x DPR');
    expect(formatDimensionsSummary(1280, 720, 1.25)).toBe('1280 × 720 px · 1.25x DPR');

    expect(computeFitZoom(1000, 2000)).toBe(0.5);
    expect(computeFitZoom(1200, 600)).toBe(1);
    expect(stepZoom(1, 'in')).toBe(1.25);
    expect(stepZoom(1, 'out')).toBe(0.75);
    expect(stepZoom(4, 'in')).toBe(4);
    expect(stepZoom(0.1, 'out')).toBe(0.1);
  });

  it('normalizes persisted export preferences safely with fallback defaults', () => {
    expect(normalizeExportPreferences(null)).toEqual({ format: 'png', qualityPercent: 92 });
    expect(normalizeExportPreferences({ format: 'webp', qualityPercent: 80 })).toEqual({
      format: 'webp',
      qualityPercent: 80,
    });
    expect(normalizeExportPreferences({ format: 'bmp', qualityPercent: 12 })).toEqual({
      format: 'png',
      qualityPercent: 60,
    });
  });
});

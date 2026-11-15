import type { ExportFormat } from '../shared/constants';

export const MIN_QUALITY_PERCENT = 60;
export const MAX_QUALITY_PERCENT = 100;
export const DEFAULT_QUALITY_PERCENT = 92;

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4.0;
export const ZOOM_STEPS: readonly number[] = [
  0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4,
];

export function isExportFormat(value: unknown): value is ExportFormat {
  return value === 'png' || value === 'jpeg' || value === 'webp';
}

export function clampQualityPercent(percent: number): number {
  if (!Number.isFinite(percent)) {
    return DEFAULT_QUALITY_PERCENT;
  }
  return Math.min(MAX_QUALITY_PERCENT, Math.max(MIN_QUALITY_PERCENT, Math.round(percent)));
}

export function qualityPercentToFloat(percent: number): number {
  return clampQualityPercent(percent) / 100;
}

export function mimeTypeForFormat(format: ExportFormat): 'image/png' | 'image/jpeg' | 'image/webp' {
  switch (format) {
    case 'png':
      return 'image/png';
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
  }
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  if (bytes < 1024) {
    return `${String(Math.round(bytes))} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

export function formatDimensionsSummary(widthPx: number, heightPx: number, dpr: number): string {
  const safeDpr = Number.isInteger(dpr)
    ? String(dpr)
    : dpr.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return `${String(Math.round(widthPx))} × ${String(Math.round(heightPx))} px · ${safeDpr}x DPR`;
}

export function computeFitZoom(
  stageWidthPx: number,
  imageWidthPx: number,
  minZoom: number = MIN_ZOOM,
  maxZoom: number = 1,
): number {
  if (!Number.isFinite(stageWidthPx) || !Number.isFinite(imageWidthPx) || imageWidthPx <= 0) {
    return 1;
  }
  const availableWidth = Math.max(120, stageWidthPx);
  const raw = availableWidth / imageWidthPx;
  const clamped = Math.min(maxZoom, Math.max(minZoom, raw));
  return Math.round(clamped * 100) / 100;
}

export function stepZoom(currentZoom: number, direction: 'in' | 'out'): number {
  if (direction === 'in') {
    for (const candidate of ZOOM_STEPS) {
      if (candidate > currentZoom + 0.005) {
        return candidate;
      }
    }
    return MAX_ZOOM;
  }

  for (let i = ZOOM_STEPS.length - 1; i >= 0; i -= 1) {
    const candidate = ZOOM_STEPS[i];
    if (candidate !== undefined && candidate < currentZoom - 0.005) {
      return candidate;
    }
  }
  return MIN_ZOOM;
}

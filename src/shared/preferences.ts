import {
  clampQualityPercent,
  DEFAULT_QUALITY_PERCENT,
  isExportFormat,
} from '../stitcher/export-utils';
import type { ExportFormat } from './constants';

export type UiLocalePreference = 'auto' | 'en' | 'ar';

export interface ExportPreferences {
  readonly format: ExportFormat;
  readonly qualityPercent: number;
  readonly locale: UiLocalePreference;
}

export const EXPORT_PREFERENCES_KEY = 'wss_export_preferences';

export const DEFAULT_EXPORT_PREFERENCES: ExportPreferences = {
  format: 'png',
  qualityPercent: DEFAULT_QUALITY_PERCENT,
  locale: 'auto',
};

function isUiLocalePreference(value: unknown): value is UiLocalePreference {
  return value === 'auto' || value === 'en' || value === 'ar';
}

export function normalizeExportPreferences(raw: unknown): ExportPreferences {
  if (typeof raw !== 'object' || raw === null) {
    return DEFAULT_EXPORT_PREFERENCES;
  }
  const record = raw as Record<string, unknown>;
  const format = isExportFormat(record['format']) ? record['format'] : 'png';
  const rawQuality =
    typeof record['qualityPercent'] === 'number'
      ? record['qualityPercent']
      : DEFAULT_QUALITY_PERCENT;
  const locale = isUiLocalePreference(record['locale']) ? record['locale'] : 'auto';

  return {
    format,
    qualityPercent: clampQualityPercent(rawQuality),
    locale,
  };
}

export async function loadExportPreferences(): Promise<ExportPreferences> {
  try {
    const stored = await chrome.storage.local.get(EXPORT_PREFERENCES_KEY);
    return normalizeExportPreferences(stored[EXPORT_PREFERENCES_KEY]);
  } catch {
    return DEFAULT_EXPORT_PREFERENCES;
  }
}

export async function saveExportPreferences(prefs: ExportPreferences): Promise<void> {
  const normalized = normalizeExportPreferences(prefs);
  try {
    await chrome.storage.local.set({ [EXPORT_PREFERENCES_KEY]: normalized });
  } catch {
    // Non-fatal if storage quota is temporarily unavailable
  }
}

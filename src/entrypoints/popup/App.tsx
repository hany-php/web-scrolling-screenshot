import { Camera, Crop, XCircle } from 'lucide-react';
import { type ReactElement, useEffect, useState } from 'react';
import {
  applyDocumentDirection,
  getEffectiveLocale,
  setPreferredLocale,
  t,
} from '../../i18n/messages';
import { type CaptureStatusSnapshot, isValidExtensionMessage } from '../../messaging/protocol';
import type { CaptureMode, ExportFormat } from '../../shared/constants';
import type { CaptureErrorCode } from '../../shared/errors';
import {
  DEFAULT_EXPORT_PREFERENCES,
  type ExportPreferences,
  loadExportPreferences,
  saveExportPreferences,
} from '../../shared/preferences';
import { MAX_QUALITY_PERCENT, MIN_QUALITY_PERCENT } from '../../stitcher/export-utils';

interface StateResponse {
  readonly ok: boolean;
  readonly state?: CaptureStatusSnapshot;
}

function getTargetTabIdFromSearch(): number | undefined {
  const raw = new URLSearchParams(window.location.search).get('targetTabId');
  if (raw === null) {
    return undefined;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function resolveStatusLabel(snapshot: CaptureStatusSnapshot): string {
  switch (snapshot.status) {
    case 'idle':
      return t('popup_status_ready', 'Ready to capture');
    case 'selecting':
      return t('popup_status_selecting', 'Select an area on the page (press Esc to cancel)…');
    case 'capturing':
      return t(
        'popup_status_capturing',
        `Capturing page… ${String(snapshot.completed)} / ${String(snapshot.total)}`,
        [String(snapshot.completed), String(snapshot.total)],
      );
    case 'stitching':
      return t('popup_status_stitching', 'Stitching High-DPI PNG…');
    case 'done':
      return t('popup_status_done', 'Preview opened — ready to download!');
    case 'cancelled':
      return t('popup_status_cancelled', 'Capture cancelled');
    case 'error':
      return resolveErrorLabel(snapshot.errorCode);
  }
}

function resolveErrorLabel(code?: CaptureErrorCode): string {
  if (code === 'RESTRICTED_PAGE') {
    return t(
      'popup_error_restricted_page',
      'Browser system pages and store pages cannot be captured for security reasons.',
    );
  }
  return t('popup_error_generic', 'Capture failed. Please refresh the page and try again.');
}

export function App(): ReactElement {
  const [snapshot, setSnapshot] = useState<CaptureStatusSnapshot>({
    status: 'idle',
    completed: 0,
    total: 0,
  });
  const [prefs, setPrefs] = useState<ExportPreferences>(DEFAULT_EXPORT_PREFERENCES);

  useEffect(() => {
    void loadExportPreferences().then((loaded) => {
      setPreferredLocale(loaded.locale);
      applyDocumentDirection();
      setPrefs(loaded);
    });

    chrome.runtime.sendMessage(
      { action: 'GET_CAPTURE_STATE' },
      (res: StateResponse | undefined) => {
        if (chrome.runtime.lastError || !res?.ok || !res.state) {
          return;
        }
        setSnapshot(res.state);
      },
    );

    const listener = (message: unknown): void => {
      if (isValidExtensionMessage(message) && message.action === 'CAPTURE_STATE') {
        setSnapshot(message.state);
        if (message.state.status === 'selecting' && getTargetTabIdFromSearch() === undefined) {
          window.close();
        }
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  const isBusy =
    snapshot.status === 'selecting' ||
    snapshot.status === 'capturing' ||
    snapshot.status === 'stitching';
  const progressPercent =
    snapshot.total > 0 ? Math.min(100, Math.round((snapshot.completed / snapshot.total) * 100)) : 0;

  function handleStart(mode: CaptureMode): void {
    const targetTabId = getTargetTabIdFromSearch();
    chrome.runtime.sendMessage(
      targetTabId !== undefined
        ? { action: 'START_CAPTURE', mode, targetTabId }
        : { action: 'START_CAPTURE', mode },
      () => {
        if (chrome.runtime.lastError) {
          setSnapshot({
            status: 'error',
            completed: 0,
            total: 0,
            errorCode: 'UNKNOWN',
            errorMessage: chrome.runtime.lastError.message ?? 'Unknown error',
          });
        }
      },
    );
  }

  function handleCancel(): void {
    chrome.runtime.sendMessage({ action: 'CANCEL_CAPTURE' }, () => {
      if (chrome.runtime.lastError) {
        return;
      }
    });
  }

  function updatePrefs(next: ExportPreferences): void {
    setPreferredLocale(next.locale);
    applyDocumentDirection();
    setPrefs(next);
    void saveExportPreferences(next);
  }

  function handleToggleLocale(): void {
    const nextLocale = getEffectiveLocale() === 'ar' ? 'en' : 'ar';
    updatePrefs({ ...prefs, locale: nextLocale });
  }

  const activeLocale = getEffectiveLocale();
  const manifestVersion =
    typeof chrome !== 'undefined' && typeof chrome.runtime.getManifest === 'function'
      ? chrome.runtime.getManifest().version
      : '1.0.0';
  const formats: readonly ExportFormat[] = ['png', 'jpeg', 'webp'];

  return (
    <main className="flex flex-col gap-3 p-4">
      <header className="flex items-center justify-between gap-2 border-b border-[var(--wss-border)] pb-3">
        <h1
          className="text-sm font-semibold text-[var(--wss-text-primary)]"
          data-testid="popup-title"
        >
          {t('popup_title', 'Web Scrolling Screenshot')}
        </h1>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="btn-toggle-locale"
            aria-label={t(
              'popup_switch_lang_label',
              'Switch interface language between Arabic and English',
            )}
            onClick={handleToggleLocale}
            className="cursor-pointer rounded-full border border-[var(--wss-border)] bg-[var(--wss-bg-surface)] px-2 py-0.5 text-[11px] font-semibold text-[var(--wss-text-primary)] transition-colors hover:border-[var(--wss-accent)] hover:bg-[var(--wss-bg-elevated)]"
          >
            {activeLocale === 'ar' ? 'EN' : 'العربية'}
          </button>
          <span
            dir="ltr"
            className="rounded-full bg-[var(--wss-bg-elevated)] px-2 py-0.5 text-[11px] font-medium text-[var(--wss-text-secondary)]"
          >
            v{manifestVersion}
          </span>
        </div>
      </header>

      {isBusy ? (
        <section className="flex flex-col gap-3 rounded-lg border border-[var(--wss-border)] bg-[var(--wss-bg-surface)] p-3">
          <div className="flex items-center justify-between text-xs font-medium text-[var(--wss-text-primary)]">
            <span data-testid="popup-progress-label">{resolveStatusLabel(snapshot)}</span>
            <span dir="ltr">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--wss-bg-elevated)]">
            <div
              className="h-full bg-[var(--wss-accent)] transition-[width] duration-150"
              style={{ width: `${String(progressPercent)}%` }}
            />
          </div>
          <button
            type="button"
            data-testid="btn-cancel-capture"
            onClick={handleCancel}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-[var(--wss-danger)] px-3 py-1.5 text-xs font-medium text-[var(--wss-danger)] hover:bg-[var(--wss-bg-elevated)]"
          >
            <XCircle size={14} aria-hidden="true" />
            <span>{t('popup_btn_cancel', 'Cancel Capture')}</span>
          </button>
        </section>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            data-testid="btn-capture-full"
            onClick={() => {
              handleStart('full');
            }}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--wss-border)] bg-[var(--wss-bg-surface)] p-3 text-start transition-colors hover:border-[var(--wss-accent)] hover:bg-[var(--wss-bg-elevated)]"
          >
            <span className="mt-0.5 rounded-md bg-[var(--wss-accent)] p-2 text-white">
              <Camera size={16} aria-hidden="true" />
            </span>
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-[var(--wss-text-primary)]">
                  {t('popup_capture_full', 'Capture Full Page')}
                </span>
                <kbd
                  dir="ltr"
                  className="rounded border border-[var(--wss-border)] bg-[var(--wss-bg-elevated)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--wss-text-secondary)]"
                >
                  Alt+Shift+F
                </kbd>
              </span>
              <span className="text-xs text-[var(--wss-text-secondary)]">
                {t(
                  'popup_capture_full_hint',
                  'Auto-scrolls and stitches at full screen resolution',
                )}
              </span>
            </span>
          </button>

          <button
            type="button"
            data-testid="btn-capture-region"
            onClick={() => {
              handleStart('region');
            }}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--wss-border)] bg-[var(--wss-bg-surface)] p-3 text-start transition-colors hover:border-[var(--wss-accent)] hover:bg-[var(--wss-bg-elevated)]"
          >
            <span className="mt-0.5 rounded-md bg-[var(--wss-bg-elevated)] p-2 text-[var(--wss-text-primary)]">
              <Crop size={16} aria-hidden="true" />
            </span>
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-[var(--wss-text-primary)]">
                  {t('popup_capture_region', 'Select Region')}
                </span>
                <kbd
                  dir="ltr"
                  className="rounded border border-[var(--wss-border)] bg-[var(--wss-bg-elevated)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--wss-text-secondary)]"
                >
                  Alt+Shift+R
                </kbd>
              </span>
              <span className="text-xs text-[var(--wss-text-secondary)]">
                {t(
                  'popup_capture_region_hint',
                  'Drag any area, including tall scrollable sections',
                )}
              </span>
            </span>
          </button>

          <section
            aria-label={t('popup_format_label', 'Default Format')}
            className="flex flex-col gap-2 rounded-lg border border-[var(--wss-border)] bg-[var(--wss-bg-surface)] p-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[var(--wss-text-secondary)]">
                {t('popup_format_label', 'Default Format')}
              </span>
              <div
                role="group"
                aria-label={t('popup_format_label', 'Default Format')}
                className="flex rounded-md border border-[var(--wss-border)] bg-[var(--wss-bg-elevated)] p-0.5"
              >
                {formats.map((fmt) => {
                  const active = prefs.format === fmt;
                  return (
                    <button
                      key={fmt}
                      type="button"
                      data-testid={`popup-format-${fmt}`}
                      aria-pressed={active}
                      onClick={() => {
                        updatePrefs({ ...prefs, format: fmt });
                      }}
                      className={`cursor-pointer rounded px-2 py-0.5 text-[11px] font-semibold uppercase transition-colors ${
                        active
                          ? 'bg-[var(--wss-accent)] text-white'
                          : 'text-[var(--wss-text-secondary)] hover:text-[var(--wss-text-primary)]'
                      }`}
                    >
                      {fmt}
                    </button>
                  );
                })}
              </div>
            </div>

            {prefs.format !== 'png' ? (
              <div className="flex items-center gap-2">
                <label
                  htmlFor="popup-quality-slider"
                  className="text-xs text-[var(--wss-text-secondary)]"
                >
                  {t('popup_quality_label', 'Quality')}
                </label>
                <input
                  id="popup-quality-slider"
                  data-testid="popup-quality-slider"
                  type="range"
                  min={MIN_QUALITY_PERCENT}
                  max={MAX_QUALITY_PERCENT}
                  value={prefs.qualityPercent}
                  onChange={(e) => {
                    updatePrefs({
                      ...prefs,
                      qualityPercent: Number(e.target.value),
                    });
                  }}
                  className="h-1.5 flex-1 cursor-pointer accent-[var(--wss-accent)]"
                />
                <span
                  dir="ltr"
                  className="w-9 text-end font-mono text-[11px] font-medium text-[var(--wss-text-primary)]"
                >
                  {String(prefs.qualityPercent)}%
                </span>
              </div>
            ) : null}
          </section>
        </div>
      )}

      <footer
        className={`text-xs ${
          snapshot.status === 'error'
            ? 'text-[var(--wss-danger)]'
            : snapshot.status === 'done'
              ? 'text-[var(--wss-success)]'
              : 'text-[var(--wss-text-secondary)]'
        }`}
        data-testid="popup-status"
        aria-live="polite"
      >
        {resolveStatusLabel(snapshot)}
      </footer>
    </main>
  );
}

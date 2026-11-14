import { Camera, Crop, XCircle } from 'lucide-react';
import { type ReactElement, useEffect, useState } from 'react';
import { t } from '../../i18n/messages';
import { type CaptureStatusSnapshot, isValidExtensionMessage } from '../../messaging/protocol';
import type { CaptureMode } from '../../shared/constants';
import type { CaptureErrorCode } from '../../shared/errors';

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
    case 'capturing':
      return t(
        'popup_status_capturing',
        `Capturing page… ${String(snapshot.completed)} / ${String(snapshot.total)}`,
        [String(snapshot.completed), String(snapshot.total)],
      );
    case 'stitching':
      return t('popup_status_stitching', 'Stitching High-DPI PNG…');
    case 'done':
      return t('popup_status_done', 'Screenshot saved!');
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

  useEffect(() => {
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
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  const isBusy = snapshot.status === 'capturing' || snapshot.status === 'stitching';
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

  return (
    <main className="flex flex-col gap-3 p-4">
      <header className="flex items-center justify-between border-b border-[var(--wss-border)] pb-3">
        <h1
          className="text-sm font-semibold text-[var(--wss-text-primary)]"
          data-testid="popup-title"
        >
          {t('popup_title', 'Web Scrolling Screenshot')}
        </h1>
        <span className="rounded-full bg-[var(--wss-bg-elevated)] px-2 py-0.5 text-[11px] font-medium text-[var(--wss-text-secondary)]">
          v0.1.0
        </span>
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
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-[var(--wss-text-primary)]">
                {t('popup_capture_full', 'Capture Full Page')}
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
            disabled
            title="Available in Phase 2"
            onClick={() => {
              handleStart('region');
            }}
            className="flex cursor-not-allowed items-start gap-3 rounded-lg border border-[var(--wss-border)] bg-[var(--wss-bg-surface)] p-3 text-start opacity-60"
          >
            <span className="mt-0.5 rounded-md bg-[var(--wss-bg-elevated)] p-2 text-[var(--wss-text-primary)]">
              <Crop size={16} aria-hidden="true" />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-[var(--wss-text-primary)]">
                {t('popup_capture_region', 'Select Region')}
              </span>
              <span className="text-xs text-[var(--wss-text-secondary)]">
                {t(
                  'popup_capture_region_hint',
                  'Drag any area, including tall scrollable sections',
                )}
              </span>
            </span>
          </button>
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

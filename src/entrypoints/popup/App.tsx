import { Camera, Crop } from 'lucide-react';
import { type ReactElement, useState } from 'react';
import { t } from '../../i18n/messages';
import type { CaptureMode } from '../../shared/constants';

export function App(): ReactElement {
  const [statusMessage, setStatusMessage] = useState<string>(() =>
    t('popup_status_ready', 'Ready to capture'),
  );

  function handleAction(mode: CaptureMode): void {
    chrome.runtime.sendMessage({ action: 'START_CAPTURE', mode }, () => {
      if (chrome.runtime.lastError) {
        setStatusMessage(chrome.runtime.lastError.message ?? 'Error');
        return;
      }
      setStatusMessage(
        mode === 'full'
          ? t('popup_capture_full', 'Capture Full Page')
          : t('popup_capture_region', 'Select Region'),
      );
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

      <div className="flex flex-col gap-2">
        <button
          type="button"
          data-testid="btn-capture-full"
          onClick={() => {
            handleAction('full');
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
              {t('popup_capture_full_hint', 'Auto-scrolls and stitches at full screen resolution')}
            </span>
          </span>
        </button>

        <button
          type="button"
          data-testid="btn-capture-region"
          onClick={() => {
            handleAction('region');
          }}
          className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--wss-border)] bg-[var(--wss-bg-surface)] p-3 text-start transition-colors hover:border-[var(--wss-accent)] hover:bg-[var(--wss-bg-elevated)]"
        >
          <span className="mt-0.5 rounded-md bg-[var(--wss-bg-elevated)] p-2 text-[var(--wss-text-primary)]">
            <Crop size={16} aria-hidden="true" />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-[var(--wss-text-primary)]">
              {t('popup_capture_region', 'Select Region')}
            </span>
            <span className="text-xs text-[var(--wss-text-secondary)]">
              {t('popup_capture_region_hint', 'Drag any area, including tall scrollable sections')}
            </span>
          </span>
        </button>
      </div>

      <footer
        className="text-xs text-[var(--wss-text-secondary)]"
        data-testid="popup-status"
        aria-live="polite"
      >
        {statusMessage}
      </footer>
    </main>
  );
}

import { Check, Download, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../../i18n/messages';
import type { ExportFormat } from '../../shared/constants';
import {
  DEFAULT_EXPORT_PREFERENCES,
  type ExportPreferences,
  loadExportPreferences,
  saveExportPreferences,
} from '../../shared/preferences';
import { loadCaptureRecord, type StoredCaptureRecord } from '../../stitcher/capture-store';
import {
  computeFitZoom,
  formatDimensionsSummary,
  formatFileSize,
  MAX_QUALITY_PERCENT,
  MAX_ZOOM,
  MIN_QUALITY_PERCENT,
  MIN_ZOOM,
  stepZoom,
} from '../../stitcher/export-utils';
import { encodeCapturePart } from '../../stitcher/image-encoder';
import { downloadCaptureParts } from './download-parts';

interface RenderedPart {
  readonly partIndex: number;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly objectUrl: string;
}

type LoadStatus = 'loading' | 'empty' | 'not_found' | 'ready';
type DownloadState = 'idle' | 'downloading' | 'done' | 'error';

function readJobIdFromUrl(): string | null {
  const raw = new URLSearchParams(window.location.search).get('jobId');
  return raw !== null && raw.trim().length > 0 ? raw.trim() : null;
}

export function App(): ReactElement {
  const jobId = useMemo(() => readJobIdFromUrl(), []);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>(() =>
    jobId === null ? 'empty' : 'loading',
  );
  const [record, setRecord] = useState<StoredCaptureRecord | null>(null);
  const [renderedParts, setRenderedParts] = useState<readonly RenderedPart[]>([]);
  const [prefs, setPrefs] = useState<ExportPreferences>(DEFAULT_EXPORT_PREFERENCES);
  const [compressedBytes, setCompressedBytes] = useState<number | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [downloadState, setDownloadState] = useState<DownloadState>('idle');

  const stageRef = useRef<HTMLDivElement | null>(null);

  const applyFitZoom = useCallback((loadedRecord: StoredCaptureRecord): void => {
    const maxWidth = loadedRecord.parts.reduce((max, p) => Math.max(max, p.widthPx), 1);
    const stageWidth = stageRef.current?.clientWidth ?? window.innerWidth;
    setZoom(computeFitZoom(stageWidth - 48, maxWidth));
  }, []);

  useEffect(() => {
    void loadExportPreferences().then(setPrefs);
  }, []);

  useEffect(() => {
    if (jobId === null) {
      return;
    }

    let cancelled = false;
    const urlsToRevoke: string[] = [];

    void loadCaptureRecord(jobId)
      .then((loaded) => {
        if (cancelled) {
          return;
        }
        if (!loaded || loaded.parts.length === 0) {
          setLoadStatus('not_found');
          return;
        }

        const displayParts: RenderedPart[] = loaded.parts.map((part) => {
          const objectUrl = URL.createObjectURL(part.pngBlob);
          urlsToRevoke.push(objectUrl);
          return {
            partIndex: part.partIndex,
            widthPx: part.widthPx,
            heightPx: part.heightPx,
            objectUrl,
          };
        });

        setRecord(loaded);
        setRenderedParts(displayParts);
        setLoadStatus('ready');
        applyFitZoom(loaded);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadStatus('not_found');
        }
      });

    return () => {
      cancelled = true;
      for (const url of urlsToRevoke) {
        URL.revokeObjectURL(url);
      }
    };
  }, [applyFitZoom, jobId]);

  useEffect(() => {
    if (!record || prefs.format === 'png') {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void Promise.all(
        record.parts.map((part) => encodeCapturePart(part, prefs.format, prefs.qualityPercent)),
      )
        .then((blobs) => {
          if (!cancelled) {
            setCompressedBytes(blobs.reduce((sum, b) => sum + b.size, 0));
          }
        })
        .catch(() => undefined);
    }, 100);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [prefs.format, prefs.qualityPercent, record]);

  useEffect(() => {
    if (loadStatus !== 'ready' || !record) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        setZoom((z) => stepZoom(z, 'in'));
      } else if (event.key === '-') {
        event.preventDefault();
        setZoom((z) => stepZoom(z, 'out'));
      } else if (event.key === '0') {
        event.preventDefault();
        applyFitZoom(record);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [applyFitZoom, loadStatus, record]);

  function updatePreferences(next: ExportPreferences): void {
    setPrefs(next);
    setCompressedBytes(null);
    setDownloadState('idle');
    void saveExportPreferences(next);
  }

  const pngTotalBytes = useMemo(
    () => (record ? record.parts.reduce((sum, p) => sum + p.pngBlob.size, 0) : 0),
    [record],
  );
  const estimatedBytes =
    prefs.format === 'png' ? pngTotalBytes : (compressedBytes ?? pngTotalBytes);

  async function handleDownload(): Promise<void> {
    if (!record || downloadState === 'downloading') {
      return;
    }
    setDownloadState('downloading');
    try {
      await downloadCaptureParts(record, prefs.format, prefs.qualityPercent);
      setDownloadState('done');
    } catch {
      setDownloadState('error');
    }
  }

  const formats: readonly ExportFormat[] = ['png', 'jpeg', 'webp'];
  const zoomPercent = Math.round(zoom * 100);

  if (loadStatus !== 'ready' || !record) {
    const message =
      loadStatus === 'loading'
        ? t('preview_loading', 'Loading screenshot…')
        : loadStatus === 'not_found'
          ? t(
              'preview_not_found',
              'This capture has expired or was closed. Take a new screenshot from the extension popup.',
            )
          : t(
              'preview_empty_state',
              'No active capture loaded yet. Trigger a capture from the extension popup.',
            );

    return (
      <main className="flex min-h-screen flex-col">
        <header className="flex min-h-14 items-center justify-between border-b border-[var(--wss-border)] bg-[var(--wss-bg-surface)] px-4">
          <h1 className="text-sm font-semibold text-[var(--wss-text-primary)]">
            {t('preview_title', 'Screenshot Preview')}
          </h1>
        </header>
        <section className="flex flex-1 items-center justify-center p-8 text-center">
          <p
            className="max-w-md text-sm text-[var(--wss-text-secondary)]"
            data-testid="preview-empty"
          >
            {message}
          </p>
        </section>
      </main>
    );
  }

  const partsCount = renderedParts.length;
  const downloadLabel =
    downloadState === 'downloading'
      ? t('preview_downloading', 'Exporting…')
      : partsCount > 1
        ? t('preview_btn_download_all', `Download All (${String(partsCount)})`, [
            String(partsCount),
          ])
        : t('preview_btn_download', 'Download');

  return (
    <main className="flex min-h-screen flex-col bg-[var(--wss-bg-canvas)]">
      <header className="sticky top-0 z-20 flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-[var(--wss-border)] bg-[var(--wss-bg-surface)] px-4 py-2 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-sm font-semibold text-[var(--wss-text-primary)]">
            {t('preview_title', 'Screenshot Preview')}
          </h1>
          <span
            dir="ltr"
            data-testid="preview-dimensions"
            className="rounded-md bg-[var(--wss-bg-elevated)] px-2 py-1 font-mono text-xs font-medium text-[var(--wss-text-primary)] tabular-nums"
          >
            {formatDimensionsSummary(record.totalWidthPx, record.totalHeightPx, record.dpr)}
          </span>
          <span
            dir="ltr"
            data-testid="preview-filesize"
            className="rounded-md bg-[var(--wss-bg-elevated)] px-2 py-1 font-mono text-xs text-[var(--wss-text-secondary)] tabular-nums"
          >
            {formatFileSize(estimatedBytes)}
          </span>
          {partsCount > 1 ? (
            <span
              data-testid="preview-parts-badge"
              className="rounded-full bg-[var(--wss-accent)]/12 px-2.5 py-0.5 text-xs font-semibold text-[var(--wss-accent)]"
            >
              {t('preview_parts_badge', `${String(partsCount)} parts`, [String(partsCount)])}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-[var(--wss-border)] bg-[var(--wss-bg-elevated)] p-1">
          <button
            type="button"
            data-testid="btn-zoom-fit"
            onClick={() => {
              applyFitZoom(record);
            }}
            className="inline-flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[var(--wss-text-primary)] hover:bg-[var(--wss-bg-surface)]"
          >
            <Maximize2 size={13} aria-hidden="true" />
            <span>{t('preview_zoom_fit', 'Fit')}</span>
          </button>
          <button
            type="button"
            data-testid="btn-zoom-100"
            onClick={() => {
              setZoom(1);
            }}
            aria-pressed={zoomPercent === 100}
            className={`cursor-pointer rounded px-2 py-1 text-xs font-medium transition-colors ${
              zoomPercent === 100
                ? 'bg-[var(--wss-accent)] text-white'
                : 'text-[var(--wss-text-primary)] hover:bg-[var(--wss-bg-surface)]'
            }`}
          >
            <span dir="ltr">{t('preview_zoom_100', '100%')}</span>
          </button>
          <button
            type="button"
            data-testid="btn-zoom-out"
            aria-label={t('preview_zoom_out', 'Zoom out')}
            onClick={() => {
              setZoom((z) => stepZoom(z, 'out'));
            }}
            className="cursor-pointer rounded p-1 text-[var(--wss-text-primary)] hover:bg-[var(--wss-bg-surface)]"
          >
            <ZoomOut size={14} aria-hidden="true" />
          </button>
          <span
            dir="ltr"
            data-testid="zoom-readout"
            className="w-11 text-center font-mono text-xs font-semibold text-[var(--wss-text-primary)] tabular-nums"
          >
            {String(zoomPercent)}%
          </span>
          <button
            type="button"
            data-testid="btn-zoom-in"
            aria-label={t('preview_zoom_in', 'Zoom in')}
            onClick={() => {
              setZoom((z) => stepZoom(z, 'in'));
            }}
            className="cursor-pointer rounded p-1 text-[var(--wss-text-primary)] hover:bg-[var(--wss-bg-surface)]"
          >
            <ZoomIn size={14} aria-hidden="true" />
          </button>
          <input
            type="range"
            data-testid="zoom-slider"
            aria-label={t('preview_zoom_in', 'Zoom in')}
            min={Math.round(MIN_ZOOM * 100)}
            max={Math.round(MAX_ZOOM * 100)}
            step={5}
            value={zoomPercent}
            onChange={(e) => {
              setZoom(Number(e.target.value) / 100);
            }}
            className="ms-1 hidden h-1.5 w-24 cursor-pointer accent-[var(--wss-accent)] sm:block"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div
            role="group"
            aria-label={t('popup_format_label', 'Default Format')}
            className="flex rounded-lg border border-[var(--wss-border)] bg-[var(--wss-bg-elevated)] p-0.5"
          >
            {formats.map((fmt) => {
              const active = prefs.format === fmt;
              return (
                <button
                  key={fmt}
                  type="button"
                  data-testid={`format-${fmt}`}
                  aria-pressed={active}
                  onClick={() => {
                    updatePreferences({ ...prefs, format: fmt });
                  }}
                  className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold uppercase transition-colors ${
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

          {prefs.format !== 'png' ? (
            <div className="flex items-center gap-2 rounded-lg border border-[var(--wss-border)] bg-[var(--wss-bg-elevated)] px-2.5 py-1">
              <label
                htmlFor="preview-quality-slider"
                className="text-xs text-[var(--wss-text-secondary)]"
              >
                {t('popup_quality_label', 'Quality')}
              </label>
              <input
                id="preview-quality-slider"
                data-testid="quality-slider"
                type="range"
                min={MIN_QUALITY_PERCENT}
                max={MAX_QUALITY_PERCENT}
                value={prefs.qualityPercent}
                onChange={(e) => {
                  updatePreferences({
                    ...prefs,
                    qualityPercent: Number(e.target.value),
                  });
                }}
                className="h-1.5 w-20 cursor-pointer accent-[var(--wss-accent)]"
              />
              <span
                dir="ltr"
                data-testid="quality-readout"
                className="w-9 text-end font-mono text-xs font-semibold text-[var(--wss-text-primary)] tabular-nums"
              >
                {String(prefs.qualityPercent)}%
              </span>
            </div>
          ) : null}

          <button
            type="button"
            data-testid="btn-download"
            disabled={downloadState === 'downloading'}
            onClick={() => {
              void handleDownload();
            }}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--wss-accent)] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--wss-accent-hover)] disabled:cursor-wait disabled:opacity-70"
          >
            {downloadState === 'done' ? (
              <Check size={14} aria-hidden="true" />
            ) : (
              <Download size={14} aria-hidden="true" />
            )}
            <span>{downloadLabel}</span>
          </button>

          {downloadState === 'done' ? (
            <span
              data-testid="preview-download-status"
              className="text-xs font-medium text-[var(--wss-success)]"
              role="status"
            >
              {t('preview_download_complete', 'Downloaded!')}
            </span>
          ) : downloadState === 'error' ? (
            <span
              data-testid="preview-download-status"
              className="text-xs font-medium text-[var(--wss-danger)]"
              role="alert"
            >
              {t('preview_download_error', 'Download failed. Please try again.')}
            </span>
          ) : null}
        </div>
      </header>

      <div ref={stageRef} className="wss-checkerboard flex-1 overflow-auto p-6">
        <div className="mx-auto flex w-max min-w-full flex-col items-center gap-6">
          {renderedParts.map((part) => (
            <figure
              key={part.partIndex}
              className="flex flex-col items-center gap-2 rounded-lg border border-[var(--wss-border)] bg-[var(--wss-bg-surface)] p-2 shadow-sm"
            >
              {partsCount > 1 ? (
                <figcaption className="text-xs font-medium text-[var(--wss-text-secondary)]">
                  {t(
                    'preview_part_header',
                    `Part ${String(part.partIndex + 1)} of ${String(partsCount)}`,
                    [String(part.partIndex + 1), String(partsCount)],
                  )}
                </figcaption>
              ) : null}
              <img
                src={part.objectUrl}
                alt={`${t('preview_title', 'Screenshot Preview')} ${String(part.partIndex + 1)}`}
                data-testid={`preview-image-part-${String(part.partIndex)}`}
                className="block max-w-none border border-[var(--wss-border)]"
                style={{
                  width: `${String(Math.max(1, Math.round(part.widthPx * zoom)))}px`,
                  height: 'auto',
                }}
              />
            </figure>
          ))}
        </div>
      </div>
    </main>
  );
}

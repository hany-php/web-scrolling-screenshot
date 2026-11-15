import { isValidExtensionMessage } from '../../messaging/protocol';
import { CanvasStitcher } from '../../stitcher/canvas-stitcher';
import { pruneExpiredCaptureRecords, saveCaptureRecord } from '../../stitcher/capture-store';

const stitcher = new CanvasStitcher();

function handleAsyncMessage(message: unknown, sendResponse: (response: unknown) => void): boolean {
  if (!isValidExtensionMessage(message)) {
    return false;
  }

  switch (message.action) {
    case 'PING_OFFSCREEN':
      sendResponse({ ok: typeof OffscreenCanvas !== 'undefined' });
      return false;

    case 'INIT_STITCH_JOB':
      try {
        stitcher.initJob(message.jobId, message.plan);
        sendResponse({ ok: true });
      } catch (err: unknown) {
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : 'INIT_STITCH_JOB failed',
        });
      }
      return false;

    case 'STITCH_TILE':
      void stitcher
        .stitchTile(
          message.jobId,
          message.step,
          message.actualScrollXCss,
          message.actualScrollYCss,
          message.tileDataUrl,
        )
        .then(() => {
          sendResponse({ ok: true });
        })
        .catch((err: unknown) => {
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : 'STITCH_TILE failed',
          });
        });
      return true;

    case 'FINALIZE_STITCH_JOB':
      void stitcher
        .finalizeJobToStore(message.jobId, message.hostname, message.mode)
        .then(async (record) => {
          await saveCaptureRecord(record);
          await pruneExpiredCaptureRecords().catch(() => undefined);
          sendResponse({
            ok: true,
            partsCount: record.parts.length,
            totalWidthPx: record.totalWidthPx,
            totalHeightPx: record.totalHeightPx,
          });
        })
        .catch((err: unknown) => {
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : 'FINALIZE_STITCH_JOB failed',
          });
        });
      return true;

    case 'ABORT_STITCH_JOB':
      stitcher.abortJob(message.jobId);
      sendResponse({ ok: true });
      return false;

    case 'REVOKE_PART_URLS':
      for (const url of message.urls) {
        URL.revokeObjectURL(url);
      }
      sendResponse({ ok: true });
      return false;

    default:
      return false;
  }
}

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) {
    return false;
  }
  return handleAsyncMessage(message, sendResponse);
});

import type { ExportFormat } from '../../shared/constants';
import type { StoredCaptureRecord } from '../../stitcher/capture-store';
import { formatScreenshotFilename } from '../../stitcher/filename';
import { encodeCapturePart } from '../../stitcher/image-encoder';

function waitForDownloadFinish(downloadId: number): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      chrome.downloads.onChanged.removeListener(onChanged);
      clearTimeout(timer);
      resolve();
    };

    const onChanged = (delta: chrome.downloads.DownloadDelta): void => {
      if (delta.id !== downloadId) {
        return;
      }
      const state = delta.state?.current;
      if (state === 'complete' || state === 'interrupted') {
        finish();
      }
    };

    chrome.downloads.onChanged.addListener(onChanged);
    const timer = setTimeout(finish, 15_000);
  });
}

/**
 * Encodes every part of a stored capture into the requested format and triggers
 * local Chrome downloads sequentially, cleaning up temporary ObjectURLs afterward.
 */
export async function downloadCaptureParts(
  record: StoredCaptureRecord,
  format: ExportFormat,
  qualityPercent: number,
): Promise<void> {
  const exportDate = new Date();
  const createdUrls: string[] = [];

  try {
    const totalParts = record.parts.length;
    for (const part of record.parts) {
      const blob = await encodeCapturePart(part, format, qualityPercent);
      const url = URL.createObjectURL(blob);
      createdUrls.push(url);

      const filename = formatScreenshotFilename({
        hostname: record.hostname,
        date: exportDate,
        partIndex: part.partIndex,
        totalParts,
        format,
      });

      const downloadId = await chrome.downloads.download({
        url,
        filename,
        saveAs: false,
      });
      await waitForDownloadFinish(downloadId);
    }
  } finally {
    for (const url of createdUrls) {
      URL.revokeObjectURL(url);
    }
  }
}

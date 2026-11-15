import type { ExportFormat } from '../shared/constants';
import type { StoredCapturePart } from './capture-store';
import { mimeTypeForFormat, qualityPercentToFloat } from './export-utils';

/**
 * Encodes a stored lossless PNG part into PNG (zero re-encode), JPEG, or WebP.
 * Frees temporary ImageBitmap and OffscreenCanvas backing stores immediately.
 */
export async function encodeCapturePart(
  part: StoredCapturePart,
  format: ExportFormat,
  qualityPercent: number,
): Promise<Blob> {
  if (format === 'png') {
    return part.pngBlob;
  }

  const bitmap = await createImageBitmap(part.pngBlob);
  const canvas = new OffscreenCanvas(part.widthPx, part.heightPx);

  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to acquire OffscreenCanvas 2D context for export');
    }

    if (format === 'jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, part.widthPx, part.heightPx);
    }

    ctx.drawImage(bitmap, 0, 0);
    return await canvas.convertToBlob({
      type: mimeTypeForFormat(format),
      quality: qualityPercentToFloat(qualityPercent),
    });
  } finally {
    bitmap.close();
    canvas.width = 0;
    canvas.height = 0;
  }
}

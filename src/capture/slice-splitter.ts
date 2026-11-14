import { MAX_CHUNK_AREA_PX, MAX_CHUNK_HEIGHT_PX } from '../shared/constants';
import type { PixelRect } from '../messaging/protocol';

export interface ChunkSpec {
  readonly chunkIndex: number;
  readonly startYPx: number;
  readonly widthPx: number;
  readonly heightPx: number;
}

export interface ChunkDrawOp {
  readonly chunkIndex: number;
  readonly srcX: number;
  readonly srcY: number;
  readonly srcW: number;
  readonly srcH: number;
  readonly destX: number;
  readonly destY: number;
  readonly destW: number;
  readonly destH: number;
}

export function computeChunkSpecs(
  totalWidthPx: number,
  totalHeightPx: number,
  maxChunkHeightPx: number = MAX_CHUNK_HEIGHT_PX,
  maxChunkAreaPx: number = MAX_CHUNK_AREA_PX,
): ChunkSpec[] {
  if (!Number.isFinite(totalWidthPx) || totalWidthPx <= 0) {
    throw new RangeError('totalWidthPx must be a positive finite number');
  }
  if (!Number.isFinite(totalHeightPx) || totalHeightPx <= 0) {
    throw new RangeError('totalHeightPx must be a positive finite number');
  }
  if (!Number.isFinite(maxChunkHeightPx) || maxChunkHeightPx <= 0) {
    throw new RangeError('maxChunkHeightPx must be a positive finite number');
  }
  if (!Number.isFinite(maxChunkAreaPx) || maxChunkAreaPx <= 0) {
    throw new RangeError('maxChunkAreaPx must be a positive finite number');
  }

  const maxAreaHeight = Math.max(1, Math.floor(maxChunkAreaPx / totalWidthPx));
  const chunkMaxHeight = Math.max(1, Math.min(Math.floor(maxChunkHeightPx), maxAreaHeight));

  const chunks: ChunkSpec[] = [];
  let cursorY = 0;
  let chunkIndex = 0;

  while (cursorY < totalHeightPx) {
    const remaining = totalHeightPx - cursorY;
    const heightPx = Math.min(chunkMaxHeight, remaining);
    chunks.push({
      chunkIndex,
      startYPx: cursorY,
      widthPx: totalWidthPx,
      heightPx,
    });
    cursorY += heightPx;
    chunkIndex += 1;
  }

  return chunks;
}

export function splitRectAcrossChunks(
  srcRect: PixelRect,
  destXpx: number,
  destYpx: number,
  chunks: readonly ChunkSpec[],
): ChunkDrawOp[] {
  if (srcRect.width <= 0 || srcRect.height <= 0) {
    return [];
  }

  const ops: ChunkDrawOp[] = [];
  const destBottomPx = destYpx + srcRect.height;

  for (const chunk of chunks) {
    const chunkBottomPx = chunk.startYPx + chunk.heightPx;
    const overlapTop = Math.max(destYpx, chunk.startYPx);
    const overlapBottom = Math.min(destBottomPx, chunkBottomPx);

    if (overlapBottom <= overlapTop) {
      continue;
    }

    const sliceHeight = overlapBottom - overlapTop;
    const srcOffsetY = overlapTop - destYpx;

    ops.push({
      chunkIndex: chunk.chunkIndex,
      srcX: srcRect.x,
      srcY: srcRect.y + srcOffsetY,
      srcW: srcRect.width,
      srcH: sliceHeight,
      destX: destXpx,
      destY: overlapTop - chunk.startYPx,
      destW: srcRect.width,
      destH: sliceHeight,
    });
  }

  return ops;
}

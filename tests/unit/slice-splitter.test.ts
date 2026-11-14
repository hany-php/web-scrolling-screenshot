import { describe, expect, it } from 'vitest';
import { computeChunkSpecs, splitRectAcrossChunks } from '../../src/capture/slice-splitter';

describe('computeChunkSpecs', () => {
  it('returns a single chunk when height and area are within limits', () => {
    expect(computeChunkSpecs(2560, 6000)).toEqual([
      { chunkIndex: 0, startYPx: 0, widthPx: 2560, heightPx: 6000 },
    ]);
  });

  it('splits tall captures at MAX_CHUNK_HEIGHT_PX without losing pixels', () => {
    const chunks = computeChunkSpecs(1920, 40_000, 16_384, 200_000_000);
    expect(chunks).toEqual([
      { chunkIndex: 0, startYPx: 0, widthPx: 1920, heightPx: 16_384 },
      { chunkIndex: 1, startYPx: 16_384, widthPx: 1920, heightPx: 16_384 },
      { chunkIndex: 2, startYPx: 32_768, widthPx: 1920, heightPx: 7_232 },
    ]);
    const totalHeight = chunks.reduce((sum, c) => sum + c.heightPx, 0);
    expect(totalHeight).toBe(40_000);
  });

  it('caps chunk height further when width is huge to respect maxChunkAreaPx', () => {
    const chunks = computeChunkSpecs(20_000, 15_000, 16_384, 200_000_000);
    expect(chunks).toEqual([
      { chunkIndex: 0, startYPx: 0, widthPx: 20_000, heightPx: 10_000 },
      { chunkIndex: 1, startYPx: 10_000, widthPx: 20_000, heightPx: 5_000 },
    ]);
  });
});

describe('splitRectAcrossChunks', () => {
  it('splits a tile spanning a chunk boundary into two exact draw ops', () => {
    const chunks = computeChunkSpecs(1000, 20_000, 16_384, 200_000_000);
    const ops = splitRectAcrossChunks(
      { x: 0, y: 100, width: 1000, height: 1200 },
      0,
      16_000,
      chunks,
    );

    expect(ops).toEqual([
      {
        chunkIndex: 0,
        srcX: 0,
        srcY: 100,
        srcW: 1000,
        srcH: 384,
        destX: 0,
        destY: 16_000,
        destW: 1000,
        destH: 384,
      },
      {
        chunkIndex: 1,
        srcX: 0,
        srcY: 484,
        srcW: 1000,
        srcH: 816,
        destX: 0,
        destY: 0,
        destW: 1000,
        destH: 816,
      },
    ]);
  });
});

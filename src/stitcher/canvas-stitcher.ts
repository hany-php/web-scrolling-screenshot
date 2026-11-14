import {
  type CapturePlan,
  type CaptureStep,
  computeTileDrawOperations,
} from '../capture/scroll-planner';
import type { StitchedPartOutput } from '../messaging/protocol';
import { CaptureError } from '../shared/errors';
import { formatScreenshotFilename } from './filename';

interface ActiveJobCanvas {
  readonly canvas: OffscreenCanvas;
  readonly ctx: OffscreenCanvasRenderingContext2D;
  readonly widthPx: number;
  readonly heightPx: number;
}

interface StitchJob {
  readonly plan: CapturePlan;
  readonly chunks: ActiveJobCanvas[];
}

export class CanvasStitcher {
  private readonly jobs = new Map<string, StitchJob>();

  public initJob(jobId: string, plan: CapturePlan): void {
    this.abortJob(jobId);

    const chunks: ActiveJobCanvas[] = plan.chunks.map((chunk) => {
      const canvas = new OffscreenCanvas(chunk.widthPx, chunk.heightPx);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new CaptureError('CANVAS_LIMIT', 'Failed to allocate 2D OffscreenCanvas context');
      }
      ctx.imageSmoothingEnabled = false;
      return {
        canvas,
        ctx,
        widthPx: chunk.widthPx,
        heightPx: chunk.heightPx,
      };
    });

    this.jobs.set(jobId, { plan, chunks });
  }

  public async stitchTile(
    jobId: string,
    step: CaptureStep,
    actualScrollXCss: number,
    actualScrollYCss: number,
    tileDataUrl: string,
  ): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new CaptureError('UNKNOWN', `Missing stitch job ${jobId}`);
    }

    const response = await fetch(tileDataUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    try {
      const ops = computeTileDrawOperations(
        step,
        actualScrollXCss,
        actualScrollYCss,
        bitmap.width,
        bitmap.height,
        job.plan,
      );

      for (const op of ops) {
        const targetChunk = job.chunks[op.chunkIndex];
        if (!targetChunk) {
          throw new CaptureError('UNKNOWN', `Invalid chunk index ${String(op.chunkIndex)}`);
        }
        targetChunk.ctx.drawImage(
          bitmap,
          op.srcX,
          op.srcY,
          op.srcW,
          op.srcH,
          op.destX,
          op.destY,
          op.destW,
          op.destH,
        );
      }
    } finally {
      bitmap.close();
    }
  }

  public async finalizeJob(jobId: string, hostname: string): Promise<StitchedPartOutput[]> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new CaptureError('UNKNOWN', `Missing stitch job ${jobId}`);
    }

    const now = new Date();
    const totalParts = job.chunks.length;
    const parts: StitchedPartOutput[] = [];

    try {
      for (let i = 0; i < job.chunks.length; i += 1) {
        const chunk = job.chunks[i];
        if (!chunk) {
          continue;
        }
        const blob = await chunk.canvas.convertToBlob({ type: 'image/png' });
        const objectUrl = URL.createObjectURL(blob);
        parts.push({
          objectUrl,
          filename: formatScreenshotFilename({
            hostname,
            date: now,
            partIndex: i,
            totalParts,
            format: 'png',
          }),
          widthPx: chunk.widthPx,
          heightPx: chunk.heightPx,
        });
      }
      return parts;
    } finally {
      this.abortJob(jobId);
    }
  }

  public abortJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      return;
    }
    for (const chunk of job.chunks) {
      chunk.canvas.width = 0;
      chunk.canvas.height = 0;
    }
    this.jobs.delete(jobId);
  }
}

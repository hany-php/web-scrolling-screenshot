import { MAX_CHUNK_AREA_PX, MAX_CHUNK_HEIGHT_PX } from '../shared/constants';
import { scaleCssToPhysicalPx } from './dimensions';
import {
  type ChunkDrawOp,
  type ChunkSpec,
  computeChunkSpecs,
  splitRectAcrossChunks,
} from './slice-splitter';

export interface PageMetrics {
  readonly pageWidthCss: number;
  readonly pageHeightCss: number;
  readonly viewportWidthCss: number;
  readonly viewportHeightCss: number;
  readonly dpr: number;
}

export interface CssRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CaptureStep {
  readonly stepIndex: number;
  readonly scrollXCss: number;
  readonly scrollYCss: number;
  readonly targetStartXCss: number;
  readonly targetStartYCss: number;
  readonly coveredWidthCss: number;
  readonly coveredHeightCss: number;
}

export interface CapturePlan {
  readonly targetCss: CssRect;
  readonly viewportWidthCss: number;
  readonly viewportHeightCss: number;
  readonly totalWidthPx: number;
  readonly totalHeightPx: number;
  readonly dpr: number;
  readonly chunks: readonly ChunkSpec[];
  readonly steps: readonly CaptureStep[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeTargetRegion(metrics: PageMetrics, regionCss?: CssRect): CssRect {
  if (!regionCss) {
    return {
      x: 0,
      y: 0,
      width: metrics.pageWidthCss,
      height: metrics.pageHeightCss,
    };
  }

  const x = clamp(regionCss.x, 0, Math.max(0, metrics.pageWidthCss - 1));
  const y = clamp(regionCss.y, 0, Math.max(0, metrics.pageHeightCss - 1));
  const width = clamp(regionCss.width, 1, metrics.pageWidthCss - x);
  const height = clamp(regionCss.height, 1, metrics.pageHeightCss - y);

  return { x, y, width, height };
}

export function computeCapturePlan(
  metrics: PageMetrics,
  regionCss?: CssRect,
  maxChunkHeightPx: number = MAX_CHUNK_HEIGHT_PX,
  maxChunkAreaPx: number = MAX_CHUNK_AREA_PX,
): CapturePlan {
  if (metrics.viewportWidthCss <= 0 || metrics.viewportHeightCss <= 0) {
    throw new RangeError('viewport dimensions must be positive');
  }
  if (metrics.pageWidthCss <= 0 || metrics.pageHeightCss <= 0) {
    throw new RangeError('page dimensions must be positive');
  }

  const targetCss = normalizeTargetRegion(metrics, regionCss);
  const { widthPx: totalWidthPx, heightPx: totalHeightPx } = scaleCssToPhysicalPx(
    targetCss.width,
    targetCss.height,
    metrics.dpr,
  );
  const chunks = computeChunkSpecs(totalWidthPx, totalHeightPx, maxChunkHeightPx, maxChunkAreaPx);

  const maxScrollX = Math.max(0, metrics.pageWidthCss - metrics.viewportWidthCss);
  const maxScrollY = Math.max(0, metrics.pageHeightCss - metrics.viewportHeightCss);
  const overlapXCss = metrics.viewportWidthCss > 32 ? 4 : 0;
  const overlapYCss = metrics.viewportHeightCss > 32 ? 4 : 0;

  const steps: CaptureStep[] = [];
  let stepIndex = 0;
  let offsetY = 0;

  while (offsetY < targetCss.height) {
    const targetStartYCss = targetCss.y + offsetY;
    const remainingYCss = targetCss.height - offsetY;
    const coveredHeightCss =
      remainingYCss <= metrics.viewportHeightCss
        ? remainingYCss
        : metrics.viewportHeightCss - overlapYCss;
    const scrollYCss = clamp(targetStartYCss, 0, maxScrollY);

    let offsetX = 0;
    while (offsetX < targetCss.width) {
      const targetStartXCss = targetCss.x + offsetX;
      const remainingXCss = targetCss.width - offsetX;
      const coveredWidthCss =
        remainingXCss <= metrics.viewportWidthCss
          ? remainingXCss
          : metrics.viewportWidthCss - overlapXCss;
      const scrollXCss = clamp(targetStartXCss, 0, maxScrollX);

      steps.push({
        stepIndex,
        scrollXCss,
        scrollYCss,
        targetStartXCss,
        targetStartYCss,
        coveredWidthCss,
        coveredHeightCss,
      });

      stepIndex += 1;
      offsetX += coveredWidthCss;
    }

    offsetY += coveredHeightCss;
  }

  return {
    targetCss,
    viewportWidthCss: metrics.viewportWidthCss,
    viewportHeightCss: metrics.viewportHeightCss,
    totalWidthPx,
    totalHeightPx,
    dpr: metrics.dpr,
    chunks,
    steps,
  };
}

export function computeTileDrawOperations(
  step: CaptureStep,
  actualScrollXCss: number,
  actualScrollYCss: number,
  frameWidthPx: number,
  frameHeightPx: number,
  plan: CapturePlan,
): ChunkDrawOp[] {
  const { dpr, targetCss, chunks } = plan;

  const destLeft = Math.round((step.targetStartXCss - targetCss.x) * dpr);
  const destRight = Math.round((step.targetStartXCss + step.coveredWidthCss - targetCss.x) * dpr);
  const destTop = Math.round((step.targetStartYCss - targetCss.y) * dpr);
  const destBottom = Math.round((step.targetStartYCss + step.coveredHeightCss - targetCss.y) * dpr);

  const destW = Math.min(destRight - destLeft, plan.totalWidthPx - destLeft);
  const destH = Math.min(destBottom - destTop, plan.totalHeightPx - destTop);

  if (destW <= 0 || destH <= 0) {
    return [];
  }

  const srcX = Math.max(0, Math.round((step.targetStartXCss - actualScrollXCss) * dpr));
  const srcY = Math.max(0, Math.round((step.targetStartYCss - actualScrollYCss) * dpr));
  const srcW = Math.min(destW, Math.max(0, frameWidthPx - srcX));
  const srcH = Math.min(destH, Math.max(0, frameHeightPx - srcY));

  if (srcW <= 0 || srcH <= 0) {
    return [];
  }

  return splitRectAcrossChunks(
    { x: srcX, y: srcY, width: srcW, height: srcH },
    destLeft,
    destTop,
    chunks,
  );
}

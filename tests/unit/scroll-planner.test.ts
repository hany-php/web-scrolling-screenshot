import { describe, expect, it } from 'vitest';
import { computeCapturePlan, computeTileDrawOperations } from '../../src/capture/scroll-planner';

describe('computeCapturePlan', () => {
  it('plans full-page vertical steps with clamped final scroll offset at 2x DPR', () => {
    const plan = computeCapturePlan({
      pageWidthCss: 1280,
      pageHeightCss: 2500,
      viewportWidthCss: 1280,
      viewportHeightCss: 800,
      dpr: 2,
    });

    expect(plan.totalWidthPx).toBe(2560);
    expect(plan.totalHeightPx).toBe(5000);
    expect(plan.steps).toHaveLength(4);
    expect(plan.steps[3]).toEqual({
      stepIndex: 3,
      scrollXCss: 0,
      scrollYCss: 1700,
      targetStartXCss: 0,
      targetStartYCss: 2388,
      coveredWidthCss: 1280,
      coveredHeightCss: 112,
    });

    const lastStep = plan.steps[3];
    expect(lastStep).toBeDefined();
    if (!lastStep) {
      throw new Error('Expected step 3 to exist');
    }

    const lastOps = computeTileDrawOperations(lastStep, 0, 1700, 2560, 1600, plan);
    expect(lastOps).toEqual([
      {
        chunkIndex: 0,
        srcX: 0,
        srcY: 1376,
        srcW: 2560,
        srcH: 224,
        destX: 0,
        destY: 4776,
        destW: 2560,
        destH: 224,
      },
    ]);
  });

  it('produces zero-gap, zero-overlap contiguous coverage at fractional 1.25x and 1.5x DPR', () => {
    for (const dpr of [1, 1.25, 1.5, 2, 3]) {
      const plan = computeCapturePlan({
        pageWidthCss: 1024,
        pageHeightCss: 3113,
        viewportWidthCss: 1024,
        viewportHeightCss: 777,
        dpr,
      });

      const frameW = Math.round(1024 * dpr);
      const frameH = Math.round(777 * dpr);
      const allOps = plan.steps.flatMap((step) =>
        computeTileDrawOperations(step, step.scrollXCss, step.scrollYCss, frameW, frameH, plan),
      );

      let expectedY = 0;
      for (const op of allOps) {
        expect(op.destY).toBe(expectedY);
        expectedY += op.destH;
      }
      expect(expectedY).toBe(plan.totalHeightPx);
    }
  });

  it('handles horizontal + vertical tiling on wide pages', () => {
    const plan = computeCapturePlan({
      pageWidthCss: 1800,
      pageHeightCss: 1400,
      viewportWidthCss: 1000,
      viewportHeightCss: 800,
      dpr: 1,
    });

    expect(plan.steps).toHaveLength(4);
    expect(plan.steps[1]).toMatchObject({
      scrollXCss: 800,
      scrollYCss: 0,
      targetStartXCss: 996,
      coveredWidthCss: 804,
    });
  });

  it('supports region clipping for partial page plans', () => {
    const plan = computeCapturePlan(
      {
        pageWidthCss: 1200,
        pageHeightCss: 4000,
        viewportWidthCss: 1200,
        viewportHeightCss: 800,
        dpr: 2,
      },
      { x: 100, y: 500, width: 400, height: 1000 },
    );

    expect(plan.totalWidthPx).toBe(800);
    expect(plan.totalHeightPx).toBe(2000);
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0]?.scrollYCss).toBe(500);
    expect(plan.steps[1]?.scrollYCss).toBe(1296);
  });
});

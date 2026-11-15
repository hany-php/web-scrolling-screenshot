import { describe, expect, it } from 'vitest';

import {
  computeAutoScrollDelta,
  getActiveEdgeZones,
  isValidSelectionRect,
  normalizeSelectionBox,
  pageRectToViewportRect,
} from '../../src/capture/region-math';
import {
  computeCapturePlan,
  computeTileDrawOperations,
  type CssRect,
  type PageMetrics,
} from '../../src/capture/scroll-planner';

describe('region-math', () => {
  it('normalizes drag rectangles across all four directions and clamps to page bounds', () => {
    expect(normalizeSelectionBox(100, 200, 500, 650, 1280, 3500)).toEqual({
      x: 100,
      y: 200,
      width: 400,
      height: 450,
    });

    // Bottom-right to top-left drag
    expect(normalizeSelectionBox(500, 650, 100, 200, 1280, 3500)).toEqual({
      x: 100,
      y: 200,
      width: 400,
      height: 450,
    });

    // Top-right to bottom-left drag
    expect(normalizeSelectionBox(500, 200, 100, 650, 1280, 3500)).toEqual({
      x: 100,
      y: 200,
      width: 400,
      height: 450,
    });

    // Bottom-left to top-right drag with out-of-bounds endpoints
    expect(normalizeSelectionBox(-40, 3600, 1400, 120, 1280, 3500)).toEqual({
      x: 0,
      y: 120,
      width: 1280,
      height: 3380,
    });
  });

  it('validates minimum drag size threshold', () => {
    expect(isValidSelectionRect({ x: 10, y: 10, width: 7, height: 100 })).toBe(false);
    expect(isValidSelectionRect({ x: 10, y: 10, width: 100, height: 7 })).toBe(false);
    expect(isValidSelectionRect({ x: 10, y: 10, width: 8, height: 8 })).toBe(true);
  });

  it('computes edge auto-scroll deltas only inside the 48px viewport edge zones', () => {
    expect(computeAutoScrollDelta(0, 720)).toBe(-28);
    expect(computeAutoScrollDelta(24, 720)).toBe(-14);
    expect(computeAutoScrollDelta(47, 720)).toBe(-1);
    expect(computeAutoScrollDelta(48, 720)).toBe(0);
    expect(computeAutoScrollDelta(360, 720)).toBe(0);
    expect(computeAutoScrollDelta(672, 720)).toBe(0);
    expect(computeAutoScrollDelta(673, 720)).toBe(1);
    expect(computeAutoScrollDelta(696, 720)).toBe(14);
    expect(computeAutoScrollDelta(720, 720)).toBe(28);
    expect(computeAutoScrollDelta(10, 0)).toBe(0);
  });

  it('reports active viewport edge zones accurately', () => {
    expect(getActiveEdgeZones(10, 20, 1280, 720)).toEqual({
      top: true,
      bottom: false,
      left: true,
      right: false,
    });
    expect(getActiveEdgeZones(1260, 700, 1280, 720)).toEqual({
      top: false,
      bottom: true,
      left: false,
      right: true,
    });
    expect(getActiveEdgeZones(500, 360, 1280, 720)).toEqual({
      top: false,
      bottom: false,
      left: false,
      right: false,
    });
  });

  it('projects and clips page selection rectangles into viewport coordinates while scrolling', () => {
    const tallRegion: CssRect = { x: 150, y: 400, width: 500, height: 1800 };

    // Initial view at scrollY = 0
    expect(pageRectToViewportRect(tallRegion, 0, 0, 1280, 720)).toEqual({
      x: 150,
      y: 400,
      width: 500,
      height: 320,
      visible: true,
    });

    // Mid-scroll where selection spans full viewport height
    expect(pageRectToViewportRect(tallRegion, 0, 900, 1280, 720)).toEqual({
      x: 150,
      y: 0,
      width: 500,
      height: 720,
      visible: true,
    });

    // Scrolled past the bottom of the selection
    expect(pageRectToViewportRect(tallRegion, 0, 2300, 1280, 720)).toEqual({
      x: 150,
      y: 0,
      width: 500,
      height: 0,
      visible: false,
    });
  });

  it.each([1, 1.25, 1.5, 2, 3])(
    'plans small and 1800px tall region captures cleanly at DPR %s with zero crop gaps',
    (dpr) => {
      const metrics: PageMetrics = {
        pageWidthCss: 1280,
        pageHeightCss: 3500,
        viewportWidthCss: 1280,
        viewportHeightCss: 720,
        dpr,
      };

      const smallRegion: CssRect = { x: 120, y: 240, width: 400, height: 300 };
      const smallPlan = computeCapturePlan(metrics, smallRegion);
      expect(smallPlan.steps).toHaveLength(1);
      expect(smallPlan.totalWidthPx).toBe(Math.round(400 * dpr));
      expect(smallPlan.totalHeightPx).toBe(Math.round(300 * dpr));

      const firstSmallStep = smallPlan.steps[0];
      expect(firstSmallStep).toBeDefined();
      if (!firstSmallStep) {
        return;
      }
      const smallOps = computeTileDrawOperations(
        firstSmallStep,
        firstSmallStep.scrollXCss,
        firstSmallStep.scrollYCss,
        Math.round(metrics.viewportWidthCss * dpr),
        Math.round(metrics.viewportHeightCss * dpr),
        smallPlan,
      );
      expect(smallOps).toHaveLength(1);
      expect(smallOps[0]).toMatchObject({
        chunkIndex: 0,
        destX: 0,
        destY: 0,
        destW: smallPlan.totalWidthPx,
        destH: smallPlan.totalHeightPx,
        srcX: Math.round((smallRegion.x - firstSmallStep.scrollXCss) * dpr),
        srcY: Math.round((smallRegion.y - firstSmallStep.scrollYCss) * dpr),
        srcW: smallPlan.totalWidthPx,
        srcH: smallPlan.totalHeightPx,
      });

      const tallRegion: CssRect = { x: 200, y: 400, width: 500, height: 1800 };
      const tallPlan = computeCapturePlan(metrics, tallRegion);
      expect(tallPlan.steps.length).toBeGreaterThanOrEqual(3);
      expect(tallPlan.totalWidthPx).toBe(Math.round(500 * dpr));
      expect(tallPlan.totalHeightPx).toBe(Math.round(1800 * dpr));

      let coveredAreaPx = 0;
      let expectedNextDestY = 0;
      for (const step of tallPlan.steps) {
        const ops = computeTileDrawOperations(
          step,
          step.scrollXCss,
          step.scrollYCss,
          Math.round(metrics.viewportWidthCss * dpr),
          Math.round(metrics.viewportHeightCss * dpr),
          tallPlan,
        );
        expect(ops).toHaveLength(1);
        const op = ops[0];
        if (!op) {
          continue;
        }
        expect(op.destX).toBe(0);
        expect(op.destY).toBe(expectedNextDestY);
        expect(op.destW).toBe(tallPlan.totalWidthPx);
        expectedNextDestY += op.destH;
        coveredAreaPx += op.destW * op.destH;
      }

      expect(expectedNextDestY).toBe(tallPlan.totalHeightPx);
      expect(coveredAreaPx).toBe(tallPlan.totalWidthPx * tallPlan.totalHeightPx);
    },
  );
});

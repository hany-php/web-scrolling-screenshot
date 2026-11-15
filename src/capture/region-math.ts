import type { CssRect } from './scroll-planner';

export const MIN_REGION_SIZE_CSS = 8;
export const EDGE_SCROLL_ZONE_PX = 48;
export const EDGE_SCROLL_MAX_STEP_PX = 28;

export interface ViewportClippedRect extends CssRect {
  readonly visible: boolean;
}

export interface EdgeZoneState {
  readonly top: boolean;
  readonly bottom: boolean;
  readonly left: boolean;
  readonly right: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Normalizes two drag endpoints in page CSS coordinates into an integer-aligned
 * rectangle clamped to the document bounds. Supports dragging in all 4 directions.
 */
export function normalizeSelectionBox(
  anchorPageX: number,
  anchorPageY: number,
  currentPageX: number,
  currentPageY: number,
  pageWidthCss: number,
  pageHeightCss: number,
): CssRect {
  const safePageWidth = Math.max(0, Math.floor(pageWidthCss));
  const safePageHeight = Math.max(0, Math.floor(pageHeightCss));

  const x1 = Math.round(clamp(anchorPageX, 0, safePageWidth));
  const y1 = Math.round(clamp(anchorPageY, 0, safePageHeight));
  const x2 = Math.round(clamp(currentPageX, 0, safePageWidth));
  const y2 = Math.round(clamp(currentPageY, 0, safePageHeight));

  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const right = Math.max(x1, x2);
  const bottom = Math.max(y1, y2);

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

/**
 * Returns true if the dragged selection meets the minimum intentional size threshold.
 */
export function isValidSelectionRect(
  rect: CssRect,
  minSizeCss: number = MIN_REGION_SIZE_CSS,
): boolean {
  return rect.width >= minSizeCss && rect.height >= minSizeCss;
}

/**
 * Computes per-frame auto-scroll delta along one axis when the pointer is within
 * the top/bottom (or left/right) edge zone of the viewport.
 */
export function computeAutoScrollDelta(
  clientPos: number,
  viewportSize: number,
  edgeZonePx: number = EDGE_SCROLL_ZONE_PX,
  maxStepPx: number = EDGE_SCROLL_MAX_STEP_PX,
): number {
  if (viewportSize <= 0 || edgeZonePx <= 0 || maxStepPx <= 0) {
    return 0;
  }

  const effectiveZone = Math.min(edgeZonePx, viewportSize / 2);

  if (clientPos < effectiveZone) {
    const ratio = clamp((effectiveZone - clientPos) / effectiveZone, 0, 1);
    return -Math.max(1, Math.round(ratio * maxStepPx));
  }

  const farEdgeStart = viewportSize - effectiveZone;
  if (clientPos > farEdgeStart) {
    const ratio = clamp((clientPos - farEdgeStart) / effectiveZone, 0, 1);
    return Math.max(1, Math.round(ratio * maxStepPx));
  }

  return 0;
}

/**
 * Reports which viewport edge auto-scroll zones currently contain the pointer.
 */
export function getActiveEdgeZones(
  clientX: number,
  clientY: number,
  viewportWidth: number,
  viewportHeight: number,
  edgeZonePx: number = EDGE_SCROLL_ZONE_PX,
): EdgeZoneState {
  const effectiveX = Math.min(edgeZonePx, viewportWidth / 2);
  const effectiveY = Math.min(edgeZonePx, viewportHeight / 2);

  return {
    top: viewportHeight > 0 && clientY < effectiveY,
    bottom: viewportHeight > 0 && clientY > viewportHeight - effectiveY,
    left: viewportWidth > 0 && clientX < effectiveX,
    right: viewportWidth > 0 && clientX > viewportWidth - effectiveX,
  };
}

/**
 * Projects a page-space selection rectangle into viewport coordinates,
 * clipped to the visible viewport rectangle for crisp overlay rendering.
 */
export function pageRectToViewportRect(
  pageRect: CssRect,
  scrollXCss: number,
  scrollYCss: number,
  viewportWidthCss: number,
  viewportHeightCss: number,
): ViewportClippedRect {
  const rawLeft = pageRect.x - scrollXCss;
  const rawTop = pageRect.y - scrollYCss;
  const rawRight = rawLeft + pageRect.width;
  const rawBottom = rawTop + pageRect.height;

  const left = clamp(rawLeft, 0, viewportWidthCss);
  const top = clamp(rawTop, 0, viewportHeightCss);
  const right = clamp(rawRight, 0, viewportWidthCss);
  const bottom = clamp(rawBottom, 0, viewportHeightCss);

  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);

  return {
    x: left,
    y: top,
    width,
    height,
    visible: width > 0 && height > 0,
  };
}

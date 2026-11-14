export interface PhysicalDimensions {
  readonly widthPx: number;
  readonly heightPx: number;
}

export function scaleCssToPhysicalPx(
  cssWidth: number,
  cssHeight: number,
  dpr: number,
): PhysicalDimensions {
  if (!Number.isFinite(cssWidth) || cssWidth <= 0) {
    throw new RangeError('cssWidth must be a positive finite number');
  }
  if (!Number.isFinite(cssHeight) || cssHeight <= 0) {
    throw new RangeError('cssHeight must be a positive finite number');
  }
  if (!Number.isFinite(dpr) || dpr <= 0) {
    throw new RangeError('dpr must be a positive finite number');
  }

  return {
    widthPx: Math.max(1, Math.round(cssWidth * dpr)),
    heightPx: Math.max(1, Math.round(cssHeight * dpr)),
  };
}

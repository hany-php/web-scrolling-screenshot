import { describe, expect, it } from 'vitest';
import { scaleCssToPhysicalPx } from '../../src/capture/dimensions';

describe('scaleCssToPhysicalPx', () => {
  it('scales CSS dimensions cleanly at 1x, 1.5x, 2x, and 3x DPR', () => {
    expect(scaleCssToPhysicalPx(1280, 4000, 1)).toEqual({ widthPx: 1280, heightPx: 4000 });
    expect(scaleCssToPhysicalPx(1280, 4001, 1.5)).toEqual({ widthPx: 1920, heightPx: 6002 });
    expect(scaleCssToPhysicalPx(1440, 3200, 2)).toEqual({ widthPx: 2880, heightPx: 6400 });
    expect(scaleCssToPhysicalPx(390, 844, 3)).toEqual({ widthPx: 1170, heightPx: 2532 });
  });

  it('rejects non-positive or non-finite inputs', () => {
    expect(() => scaleCssToPhysicalPx(0, 100, 1)).toThrow(RangeError);
    expect(() => scaleCssToPhysicalPx(100, -1, 1)).toThrow(RangeError);
    expect(() => scaleCssToPhysicalPx(100, 100, Number.NaN)).toThrow(RangeError);
  });
});

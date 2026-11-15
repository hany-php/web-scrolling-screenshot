import { describe, expect, it } from 'vitest';

import {
  type ScrollerCandidate,
  selectPrimaryInnerScroller,
} from '../../src/capture/inner-scroller';

describe('selectPrimaryInnerScroller', () => {
  it('picks the full-viewport scrollable container for fixed-shell SPAs', () => {
    const candidates: ScrollerCandidate[] = [
      {
        index: 0,
        clientWidth: 280,
        clientHeight: 720,
        scrollWidth: 280,
        scrollHeight: 1600,
        rectLeft: 0,
        rectTop: 0,
        overflowY: 'auto',
      },
      {
        index: 1,
        clientWidth: 1280,
        clientHeight: 720,
        scrollWidth: 1280,
        scrollHeight: 3200,
        rectLeft: 0,
        rectTop: 0,
        overflowY: 'auto',
      },
    ];

    expect(selectPrimaryInnerScroller(candidates, 1280, 720)).toBe(1);
  });

  it('ignores non-scrollable or small sub-containers', () => {
    const candidates: ScrollerCandidate[] = [
      {
        index: 0,
        clientWidth: 1280,
        clientHeight: 720,
        scrollWidth: 1280,
        scrollHeight: 3000,
        rectLeft: 0,
        rectTop: 0,
        overflowY: 'hidden',
      },
      {
        index: 1,
        clientWidth: 400,
        clientHeight: 300,
        scrollWidth: 400,
        scrollHeight: 900,
        rectLeft: 50,
        rectTop: 120,
        overflowY: 'scroll',
      },
    ];

    expect(selectPrimaryInnerScroller(candidates, 1280, 720)).toBe(-1);
  });
});

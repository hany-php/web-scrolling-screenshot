export interface ScrollerCandidate {
  readonly index: number;
  readonly clientWidth: number;
  readonly clientHeight: number;
  readonly scrollWidth: number;
  readonly scrollHeight: number;
  readonly rectLeft: number;
  readonly rectTop: number;
  readonly overflowY: string;
}

/**
 * Selects the index of the dominant inner scrollable container when the document root
 * does not scroll vertically on its own (common in fixed-shell SPAs). Returns `-1` if none qualifies.
 */
export function selectPrimaryInnerScroller(
  candidates: readonly ScrollerCandidate[],
  viewportWidth: number,
  viewportHeight: number,
): number {
  let bestIndex = -1;
  let bestScore = 0;

  for (const candidate of candidates) {
    const styleAllowsScroll =
      candidate.overflowY === 'auto' ||
      candidate.overflowY === 'scroll' ||
      candidate.overflowY === 'overlay';
    if (!styleAllowsScroll) {
      continue;
    }

    const coversFullShell =
      candidate.rectLeft <= 4 &&
      candidate.rectTop <= 4 &&
      candidate.clientWidth >= viewportWidth * 0.85 &&
      candidate.clientHeight >= viewportHeight * 0.85;
    if (!coversFullShell) {
      continue;
    }

    if (candidate.scrollHeight <= candidate.clientHeight + 24) {
      continue;
    }

    const score = candidate.clientWidth * candidate.scrollHeight;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = candidate.index;
    }
  }

  return bestIndex;
}

/**
 * Finds the dominant full-viewport inner scrollable element in the current DOM, if any.
 */
export function findInnerScrollContainer(): HTMLElement | null {
  const viewportWidth = Math.max(1, window.innerWidth);
  const viewportHeight = Math.max(1, window.innerHeight);

  const docEl = document.documentElement;
  if (docEl.scrollHeight > viewportHeight + 8 || docEl.scrollWidth > viewportWidth + 8) {
    return null;
  }

  const body = document.body as HTMLElement | null;
  const allElements = body ? Array.from(body.querySelectorAll<HTMLElement>('*')) : [];
  const candidates: ScrollerCandidate[] = [];

  allElements.forEach((el, idx) => {
    if (el.scrollHeight <= el.clientHeight + 24) {
      return;
    }
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    candidates.push({
      index: idx,
      clientWidth: el.clientWidth,
      clientHeight: el.clientHeight,
      scrollWidth: el.scrollWidth,
      scrollHeight: el.scrollHeight,
      rectLeft: rect.left,
      rectTop: rect.top,
      overflowY: style.overflowY,
    });
  });

  const chosenIdx = selectPrimaryInnerScroller(candidates, viewportWidth, viewportHeight);
  return chosenIdx >= 0 ? (allElements[chosenIdx] ?? null) : null;
}

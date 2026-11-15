import {
  computeAutoScrollDelta,
  getActiveEdgeZones,
  isValidSelectionRect,
  normalizeSelectionBox,
  pageRectToViewportRect,
} from './region-math';
import type { CssRect } from './scroll-planner';
import { SELECTION_OVERLAY_CSS } from './selection-overlay-styles';

export interface SelectionOverlayLabels {
  readonly hintDrag: string;
  readonly hintEsc: string;
  readonly cancelLabel: string;
  readonly dir: 'rtl' | 'ltr';
}

export interface ActiveSelectionSession {
  readonly promise: Promise<CssRect | null>;
  readonly cancel: () => void;
}

interface OverlayElements {
  readonly host: HTMLElement;
  readonly dimFull: HTMLElement;
  readonly dimTop: HTMLElement;
  readonly dimBottom: HTMLElement;
  readonly dimLeft: HTMLElement;
  readonly dimRight: HTMLElement;
  readonly edgeTop: HTMLElement;
  readonly edgeBottom: HTMLElement;
  readonly selectionBox: HTMLElement;
  readonly dimensionsPill: HTMLElement;
  readonly dimensionsSize: HTMLElement;
  readonly cancelButton: HTMLButtonElement;
}

const OVERLAY_ATTR = 'data-wss-overlay';
const HANDLE_POSITIONS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;

function createEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = className;
  return el;
}

function buildOverlayDom(labels: SelectionOverlayLabels): OverlayElements {
  const host = document.createElement('div');
  host.setAttribute(OVERLAY_ATTR, 'true');
  host.setAttribute('dir', labels.dir);

  const shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = SELECTION_OVERLAY_CSS;
  shadow.appendChild(style);

  const stage = createEl('div', 'stage');
  const dimFull = createEl('div', 'dim-full');
  const dimTop = createEl('div', 'dim-pane');
  const dimBottom = createEl('div', 'dim-pane');
  const dimLeft = createEl('div', 'dim-pane');
  const dimRight = createEl('div', 'dim-pane');
  for (const pane of [dimTop, dimBottom, dimLeft, dimRight]) {
    pane.style.display = 'none';
  }

  const edgeTop = createEl('div', 'edge-zone edge-zone--top');
  const edgeBottom = createEl('div', 'edge-zone edge-zone--bottom');

  const selectionBox = createEl('div', 'selection-box');
  for (const pos of HANDLE_POSITIONS) {
    selectionBox.appendChild(createEl('div', `handle handle--${pos}`));
  }

  const toolbar = createEl('div', 'toolbar');
  const hint = createEl('span', 'toolbar-hint');
  hint.textContent = labels.hintDrag;
  const cancelButton = createEl('button', 'toolbar-cancel');
  cancelButton.type = 'button';
  cancelButton.textContent = labels.cancelLabel;
  cancelButton.setAttribute('data-wss-cancel', 'true');
  toolbar.append(hint, cancelButton);

  const dimensionsPill = createEl('div', 'dimensions-pill');
  const dimensionsSize = createEl('span', 'dimensions-size');
  const dimensionsEsc = createEl('span', 'dimensions-esc');
  dimensionsEsc.textContent = labels.hintEsc;
  dimensionsPill.append(dimensionsSize, dimensionsEsc);

  stage.append(
    dimFull,
    dimTop,
    dimBottom,
    dimLeft,
    dimRight,
    edgeTop,
    edgeBottom,
    selectionBox,
    toolbar,
    dimensionsPill,
  );
  shadow.appendChild(stage);

  return {
    host,
    dimFull,
    dimTop,
    dimBottom,
    dimLeft,
    dimRight,
    edgeTop,
    edgeBottom,
    selectionBox,
    dimensionsPill,
    dimensionsSize,
    cancelButton,
  };
}

function setPaneRect(el: HTMLElement, x: number, y: number, w: number, h: number): void {
  if (w <= 0 || h <= 0) {
    el.style.display = 'none';
    return;
  }
  el.style.display = 'block';
  el.style.left = `${String(x)}px`;
  el.style.top = `${String(y)}px`;
  el.style.width = `${String(w)}px`;
  el.style.height = `${String(h)}px`;
}

function positionDimensionsPill(
  pill: HTMLElement,
  viewRect: CssRect,
  viewportW: number,
  viewportH: number,
): void {
  pill.style.display = 'inline-flex';
  const pillW = pill.offsetWidth || 150;
  const pillH = pill.offsetHeight || 28;
  const margin = 8;

  const preferBelowY = viewRect.y + viewRect.height + margin;
  const topY =
    preferBelowY + pillH <= viewportH
      ? preferBelowY
      : Math.max(margin, viewRect.y - pillH - margin);
  const leftX = Math.min(
    Math.max(margin, viewRect.x),
    Math.max(margin, viewportW - pillW - margin),
  );

  pill.style.left = `${String(leftX)}px`;
  pill.style.top = `${String(topY)}px`;
}

function renderSelectionVisuals(
  els: OverlayElements,
  pageRect: CssRect | null,
  clientX: number,
  clientY: number,
): void {
  const viewportW = Math.max(1, window.innerWidth);
  const viewportH = Math.max(1, window.innerHeight);

  if (!pageRect || (pageRect.width <= 0 && pageRect.height <= 0)) {
    els.dimFull.style.display = 'block';
    for (const pane of [els.dimTop, els.dimBottom, els.dimLeft, els.dimRight]) {
      pane.style.display = 'none';
    }
    els.selectionBox.style.display = 'none';
    els.dimensionsPill.style.display = 'none';
    els.edgeTop.setAttribute('data-active', 'false');
    els.edgeBottom.setAttribute('data-active', 'false');
    return;
  }

  const edges = getActiveEdgeZones(clientX, clientY, viewportW, viewportH);
  els.edgeTop.setAttribute('data-active', edges.top ? 'true' : 'false');
  els.edgeBottom.setAttribute('data-active', edges.bottom ? 'true' : 'false');

  const viewRect = pageRectToViewportRect(
    pageRect,
    window.scrollX,
    window.scrollY,
    viewportW,
    viewportH,
  );

  els.dimFull.style.display = 'none';
  if (!viewRect.visible) {
    setPaneRect(els.dimTop, 0, 0, viewportW, viewportH);
    els.dimBottom.style.display = 'none';
    els.dimLeft.style.display = 'none';
    els.dimRight.style.display = 'none';
    els.selectionBox.style.display = 'none';
    els.dimensionsPill.style.display = 'none';
    return;
  }

  setPaneRect(els.dimTop, 0, 0, viewportW, viewRect.y);
  setPaneRect(
    els.dimBottom,
    0,
    viewRect.y + viewRect.height,
    viewportW,
    viewportH - (viewRect.y + viewRect.height),
  );
  setPaneRect(els.dimLeft, 0, viewRect.y, viewRect.x, viewRect.height);
  setPaneRect(
    els.dimRight,
    viewRect.x + viewRect.width,
    viewRect.y,
    viewportW - (viewRect.x + viewRect.width),
    viewRect.height,
  );

  els.selectionBox.style.display = 'block';
  els.selectionBox.style.left = `${String(viewRect.x)}px`;
  els.selectionBox.style.top = `${String(viewRect.y)}px`;
  els.selectionBox.style.width = `${String(viewRect.width)}px`;
  els.selectionBox.style.height = `${String(viewRect.height)}px`;

  els.dimensionsSize.textContent = `${String(pageRect.width)} × ${String(pageRect.height)} px`;
  positionDimensionsPill(els.dimensionsPill, viewRect, viewportW, viewportH);
}

function waitTwoPaintFrames(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

/**
 * Mounts an isolated Shadow DOM region selector overlay, supports edge auto-scroll,
 * and resolves with the selected page-coordinate rectangle or `null` when cancelled.
 */
export function startRegionSelection(
  labels: SelectionOverlayLabels,
  getPageBounds: () => { readonly widthCss: number; readonly heightCss: number },
): ActiveSelectionSession {
  const existing = document.querySelector(`[${OVERLAY_ATTR}="true"]`);
  existing?.remove();

  const els = buildOverlayDom(labels);
  const docEl = document.documentElement;
  const origBehavior = docEl.style.getPropertyValue('scroll-behavior');
  const origBehaviorPriority = docEl.style.getPropertyPriority('scroll-behavior');
  docEl.style.setProperty('scroll-behavior', 'auto', 'important');

  docEl.appendChild(els.host);

  let settled = false;
  let dragging = false;
  let anchorPageX = 0;
  let anchorPageY = 0;
  let lastClientX = 0;
  let lastClientY = 0;
  let currentRect: CssRect | null = null;
  let autoScrollRaf = 0;
  let resolvePromise: (rect: CssRect | null) => void = () => {};

  const promise = new Promise<CssRect | null>((resolve) => {
    resolvePromise = resolve;
  });

  const updateCurrentRect = (): void => {
    const bounds = getPageBounds();
    currentRect = normalizeSelectionBox(
      anchorPageX,
      anchorPageY,
      lastClientX + window.scrollX,
      lastClientY + window.scrollY,
      bounds.widthCss,
      bounds.heightCss,
    );
    renderSelectionVisuals(els, currentRect, lastClientX, lastClientY);
  };

  const stepAutoScroll = (): void => {
    if (!dragging || settled) {
      autoScrollRaf = 0;
      return;
    }
    const dx = computeAutoScrollDelta(lastClientX, window.innerWidth);
    const dy = computeAutoScrollDelta(lastClientY, window.innerHeight);
    if (dx !== 0 || dy !== 0) {
      window.scrollBy({ left: dx, top: dy, behavior: 'instant' });
      updateCurrentRect();
    }
    autoScrollRaf = window.requestAnimationFrame(stepAutoScroll);
  };

  const cleanup = (): void => {
    dragging = false;
    if (autoScrollRaf !== 0) {
      window.cancelAnimationFrame(autoScrollRaf);
      autoScrollRaf = 0;
    }
    window.removeEventListener('mousemove', onMouseMove, true);
    window.removeEventListener('mouseup', onMouseUp, true);
    window.removeEventListener('keydown', onKeyDown, true);
    els.host.remove();

    if (origBehavior.length > 0) {
      docEl.style.setProperty('scroll-behavior', origBehavior, origBehaviorPriority);
    } else {
      docEl.style.removeProperty('scroll-behavior');
    }
  };

  const finishCancel = (): void => {
    if (settled) {
      return;
    }
    settled = true;
    cleanup();
    resolvePromise(null);
  };

  const onMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0 || settled) {
      return;
    }
    event.preventDefault();
    dragging = true;
    lastClientX = event.clientX;
    lastClientY = event.clientY;
    anchorPageX = event.clientX + window.scrollX;
    anchorPageY = event.clientY + window.scrollY;
    updateCurrentRect();
    if (autoScrollRaf === 0) {
      autoScrollRaf = window.requestAnimationFrame(stepAutoScroll);
    }
  };

  const onMouseMove = (event: MouseEvent): void => {
    if (!dragging || settled) {
      return;
    }
    lastClientX = event.clientX;
    lastClientY = event.clientY;
    updateCurrentRect();
  };

  const onMouseUp = (event: MouseEvent): void => {
    if (!dragging || settled) {
      return;
    }
    lastClientX = event.clientX;
    lastClientY = event.clientY;
    updateCurrentRect();
    dragging = false;
    if (autoScrollRaf !== 0) {
      window.cancelAnimationFrame(autoScrollRaf);
      autoScrollRaf = 0;
    }

    const selected = currentRect;
    if (!selected || !isValidSelectionRect(selected)) {
      currentRect = null;
      renderSelectionVisuals(els, null, lastClientX, lastClientY);
      return;
    }

    settled = true;
    cleanup();
    void waitTwoPaintFrames().then(() => {
      resolvePromise(selected);
    });
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      finishCancel();
    }
  };

  els.cancelButton.addEventListener('mousedown', (event) => {
    event.stopPropagation();
  });
  els.cancelButton.addEventListener('click', (event) => {
    event.stopPropagation();
    finishCancel();
  });

  els.host.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove, true);
  window.addEventListener('mouseup', onMouseUp, true);
  window.addEventListener('keydown', onKeyDown, true);

  return {
    promise,
    cancel: finishCancel,
  };
}

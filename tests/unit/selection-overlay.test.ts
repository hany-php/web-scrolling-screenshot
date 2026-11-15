// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import {
  type SelectionOverlayLabels,
  startRegionSelection,
} from '../../src/capture/selection-overlay';

const LABELS: SelectionOverlayLabels = {
  hintDrag: 'Drag to select an area',
  hintEsc: 'Esc to cancel',
  cancelLabel: 'Cancel',
  dir: 'ltr',
};

describe('SelectionOverlay (closed Shadow DOM)', () => {
  afterEach(() => {
    document.querySelectorAll('[data-wss-overlay]').forEach((el) => {
      el.remove();
    });
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('mounts inside a closed Shadow DOM without leaking styles to document.head and removes cleanly on Esc', async () => {
    const initialStyles = document.head.querySelectorAll('style').length;
    const session = startRegionSelection(LABELS, () => ({
      widthCss: 1280,
      heightCss: 2400,
    }));

    const host = document.querySelector('[data-wss-overlay="true"]');
    expect(host).not.toBeNull();
    expect(host?.shadowRoot).toBeNull();
    expect(document.head.querySelectorAll('style').length).toBe(initialStyles);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    const result = await session.promise;
    expect(result).toBeNull();
    expect(document.querySelector('[data-wss-overlay="true"]')).toBeNull();
  });

  it('captures normalized drag region on mouseup and cleans up DOM', async () => {
    const session = startRegionSelection(LABELS, () => ({
      widthCss: 1280,
      heightCss: 2400,
    }));

    const host = document.querySelector('[data-wss-overlay="true"]');
    expect(host).not.toBeNull();

    // Small click (< 8px) should keep overlay mounted
    host?.dispatchEvent(
      new MouseEvent('mousedown', { button: 0, clientX: 50, clientY: 50, bubbles: true }),
    );
    window.dispatchEvent(
      new MouseEvent('mouseup', { button: 0, clientX: 52, clientY: 52, bubbles: true }),
    );
    expect(document.querySelector('[data-wss-overlay="true"]')).not.toBeNull();

    // Real drag selection (400 x 300)
    host?.dispatchEvent(
      new MouseEvent('mousedown', { button: 0, clientX: 120, clientY: 160, bubbles: true }),
    );
    window.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 520, clientY: 460, bubbles: true }),
    );
    window.dispatchEvent(
      new MouseEvent('mouseup', { button: 0, clientX: 520, clientY: 460, bubbles: true }),
    );

    const rect = await session.promise;
    expect(rect).toEqual({
      x: 120,
      y: 160,
      width: 400,
      height: 300,
    });
    expect(document.querySelector('[data-wss-overlay="true"]')).toBeNull();
  });
});

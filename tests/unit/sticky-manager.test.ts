// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { StickyManager } from '../../src/capture/sticky-manager';

describe('StickyManager', () => {
  it('hides fixed elements after tile 0 and restores previous inline visibility', () => {
    document.body.innerHTML = `
      <header id="fixed-nav" style="position: fixed; top: 0; visibility: visible !important;">Nav</header>
      <div id="content" style="position: relative;">Body</div>
    `;

    const nav = document.getElementById('fixed-nav');
    expect(nav).not.toBeNull();
    if (!nav) {
      throw new Error('Missing nav');
    }

    const manager = new StickyManager();

    // Tile 0 (scroll 0, 0) must keep fixed nav visible
    manager.suppressAfterFirstTile(0, 0);
    expect(nav.style.getPropertyValue('visibility')).toBe('visible');

    // Tile 1 (scrolled) suppresses fixed nav
    manager.suppressAfterFirstTile(0, 800);
    expect(nav.style.getPropertyValue('visibility')).toBe('hidden');
    expect(nav.style.getPropertyPriority('visibility')).toBe('important');

    // Restore reverts exact previous inline property & priority
    manager.restoreAll();
    expect(nav.style.getPropertyValue('visibility')).toBe('visible');
    expect(nav.style.getPropertyPriority('visibility')).toBe('important');
  });
});

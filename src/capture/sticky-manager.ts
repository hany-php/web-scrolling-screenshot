interface SavedVisibility {
  readonly element: HTMLElement;
  readonly prevValue: string;
  readonly prevPriority: string;
}

export class StickyManager {
  private readonly hiddenElements: SavedVisibility[] = [];
  private readonly hiddenSet = new Set<HTMLElement>();

  public suppressAfterFirstTile(scrollX: number, scrollY: number): void {
    if (scrollX === 0 && scrollY === 0) {
      return;
    }

    const candidates = document.querySelectorAll<HTMLElement>('*');
    for (const el of candidates) {
      if (
        el === document.documentElement ||
        el === document.body ||
        this.hiddenSet.has(el) ||
        el.hasAttribute('data-wss-overlay')
      ) {
        continue;
      }

      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') {
        continue;
      }

      if (style.position === 'fixed') {
        this.hideElement(el);
        continue;
      }

      if (style.position === 'sticky' && this.isStickyPinned(el, style)) {
        this.hideElement(el);
      }
    }
  }

  public restoreAll(): void {
    for (let i = this.hiddenElements.length - 1; i >= 0; i -= 1) {
      const saved = this.hiddenElements[i];
      if (!saved) {
        continue;
      }
      if (saved.prevValue.length > 0) {
        saved.element.style.setProperty('visibility', saved.prevValue, saved.prevPriority);
      } else {
        saved.element.style.removeProperty('visibility');
      }
    }
    this.hiddenElements.length = 0;
    this.hiddenSet.clear();
  }

  private isStickyPinned(el: HTMLElement, style: CSSStyleDeclaration): boolean {
    const rect = el.getBoundingClientRect();
    const topOffset = Number.parseFloat(style.top);
    if (Number.isFinite(topOffset) && rect.top <= topOffset + 2) {
      return true;
    }

    const bottomOffset = Number.parseFloat(style.bottom);
    if (Number.isFinite(bottomOffset) && rect.bottom >= window.innerHeight - bottomOffset - 2) {
      return true;
    }

    return false;
  }

  private hideElement(el: HTMLElement): void {
    const prevValue = el.style.getPropertyValue('visibility');
    const prevPriority = el.style.getPropertyPriority('visibility');
    this.hiddenElements.push({ element: el, prevValue, prevPriority });
    this.hiddenSet.add(el);
    el.style.setProperty('visibility', 'hidden', 'important');
  }
}

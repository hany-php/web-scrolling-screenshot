/**
 * Scoped stylesheet injected exclusively inside the closed Shadow DOM of SelectionOverlay.
 * Uses CSS logical properties for RTL/LTR parity and isolates all rules from the host page.
 */
export const SELECTION_OVERLAY_CSS = `
  :host {
    all: initial;
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    pointer-events: auto;
    user-select: none;
    -webkit-user-select: none;
    font-family: 'Inter', 'IBM Plex Sans Arabic', 'Segoe UI', system-ui, -apple-system, sans-serif;
  }

  .stage {
    position: fixed;
    inset: 0;
    cursor: crosshair;
    touch-action: none;
  }

  .dim-full,
  .dim-pane {
    position: fixed;
    background: rgba(15, 23, 42, 0.45);
    pointer-events: none;
  }

  .dim-full {
    inset: 0;
  }

  .edge-zone {
    position: fixed;
    inset-inline: 0;
    height: 48px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 120ms ease-out;
  }

  .edge-zone--top {
    inset-block-start: 0;
    background: linear-gradient(to bottom, rgba(37, 99, 235, 0.34), rgba(37, 99, 235, 0));
  }

  .edge-zone--bottom {
    inset-block-end: 0;
    background: linear-gradient(to top, rgba(37, 99, 235, 0.34), rgba(37, 99, 235, 0));
  }

  .edge-zone[data-active="true"] {
    opacity: 1;
  }

  .selection-box {
    position: fixed;
    box-sizing: border-box;
    border: 2px solid #2563EB;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.65);
    pointer-events: none;
    display: none;
  }

  .handle {
    position: absolute;
    width: 8px;
    height: 8px;
    box-sizing: border-box;
    background: #FFFFFF;
    border: 1.5px solid #2563EB;
    border-radius: 2px;
  }

  .handle--nw { top: -5px; left: -5px; }
  .handle--n  { top: -5px; left: calc(50% - 4px); }
  .handle--ne { top: -5px; right: -5px; }
  .handle--e  { top: calc(50% - 4px); right: -5px; }
  .handle--se { bottom: -5px; right: -5px; }
  .handle--s  { bottom: -5px; left: calc(50% - 4px); }
  .handle--sw { bottom: -5px; left: -5px; }
  .handle--w  { top: calc(50% - 4px); left: -5px; }

  .toolbar {
    position: fixed;
    inset-block-start: 16px;
    inset-inline-start: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 10px;
    padding-block: 8px;
    padding-inline: 14px;
    border-radius: 9999px;
    background: rgba(15, 23, 42, 0.92);
    color: #F8FAFC;
    font-size: 13px;
    line-height: 1.3;
    box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.45);
    pointer-events: auto;
    white-space: nowrap;
  }

  .toolbar-cancel {
    appearance: none;
    border: 1px solid rgba(255, 255, 255, 0.22);
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.1);
    color: #F8FAFC;
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    padding-block: 3px;
    padding-inline: 10px;
    cursor: pointer;
  }

  .toolbar-cancel:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .dimensions-pill {
    position: fixed;
    display: none;
    align-items: center;
    gap: 8px;
    padding-block: 4px;
    padding-inline: 10px;
    border-radius: 6px;
    background: rgba(15, 23, 42, 0.94);
    color: #F8FAFC;
    font-size: 12px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.35);
    pointer-events: none;
    white-space: nowrap;
  }

  .dimensions-size {
    direction: ltr;
    unicode-bidi: isolate;
  }

  .dimensions-esc {
    color: #CBD5E1;
    font-weight: 500;
  }
`;

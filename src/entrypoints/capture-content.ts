import { findInnerScrollContainer } from '../capture/inner-scroller';
import { settleViewportPaint } from '../capture/lazy-loader';
import { type CapturePlan, type CssRect, computeCapturePlan } from '../capture/scroll-planner';
import { type ActiveSelectionSession, startRegionSelection } from '../capture/selection-overlay';
import { StickyManager } from '../capture/sticky-manager';
import { getTextDirection, setPreferredLocale, t } from '../i18n/messages';
import { isValidExtensionMessage } from '../messaging/protocol';
import { loadExportPreferences } from '../shared/preferences';

interface SavedScrollState {
  readonly origScrollX: number;
  readonly origScrollY: number;
  readonly docBehaviorValue: string;
  readonly docBehaviorPriority: string;
  readonly bodyBehaviorValue: string;
  readonly bodyBehaviorPriority: string;
  readonly innerContainer: HTMLElement | null;
  readonly innerOrigScrollX: number;
  readonly innerOrigScrollY: number;
  readonly innerBehaviorValue: string;
  readonly innerBehaviorPriority: string;
  readonly stickyManager: StickyManager;
}

const activeSessions = new Map<string, SavedScrollState>();
let activeSelection: { readonly jobId: string; readonly session: ActiveSelectionSession } | null =
  null;

function getPageDimensions(innerContainer?: HTMLElement | null): {
  pageWidthCss: number;
  pageHeightCss: number;
  viewportWidthCss: number;
  viewportHeightCss: number;
  dpr: number;
} {
  const docEl = document.documentElement;
  const body = document.body as HTMLElement | null;
  const container = innerContainer ?? null;

  const pageWidthCss = Math.max(
    docEl.scrollWidth,
    docEl.clientWidth,
    body?.scrollWidth ?? 0,
    body?.clientWidth ?? 0,
    container?.scrollWidth ?? 0,
    1,
  );
  const pageHeightCss = Math.max(
    docEl.scrollHeight,
    docEl.clientHeight,
    body?.scrollHeight ?? 0,
    body?.clientHeight ?? 0,
    container?.scrollHeight ?? 0,
    1,
  );

  return {
    pageWidthCss,
    pageHeightCss,
    viewportWidthCss: Math.max(1, window.innerWidth),
    viewportHeightCss: Math.max(1, window.innerHeight),
    dpr: window.devicePixelRatio || 1,
  };
}

function prepareSession(
  jobId: string,
  regionCss?: CssRect,
): { plan: CapturePlan; hostname: string } {
  if (document.contentType === 'application/pdf') {
    throw new Error('Cannot access restricted PDF document');
  }

  const docEl = document.documentElement;
  const body = document.body as HTMLElement | null;
  const innerContainer = regionCss ? null : findInnerScrollContainer();

  const saved: SavedScrollState = {
    origScrollX: window.scrollX,
    origScrollY: window.scrollY,
    docBehaviorValue: docEl.style.getPropertyValue('scroll-behavior'),
    docBehaviorPriority: docEl.style.getPropertyPriority('scroll-behavior'),
    bodyBehaviorValue: body ? body.style.getPropertyValue('scroll-behavior') : '',
    bodyBehaviorPriority: body ? body.style.getPropertyPriority('scroll-behavior') : '',
    innerContainer,
    innerOrigScrollX: innerContainer ? innerContainer.scrollLeft : 0,
    innerOrigScrollY: innerContainer ? innerContainer.scrollTop : 0,
    innerBehaviorValue: innerContainer
      ? innerContainer.style.getPropertyValue('scroll-behavior')
      : '',
    innerBehaviorPriority: innerContainer
      ? innerContainer.style.getPropertyPriority('scroll-behavior')
      : '',
    stickyManager: new StickyManager(),
  };

  activeSessions.set(jobId, saved);

  docEl.style.setProperty('scroll-behavior', 'auto', 'important');
  if (body) {
    body.style.setProperty('scroll-behavior', 'auto', 'important');
  }
  if (innerContainer) {
    innerContainer.style.setProperty('scroll-behavior', 'auto', 'important');
  }

  const plan = computeCapturePlan(getPageDimensions(innerContainer), regionCss);
  return {
    plan,
    hostname: window.location.hostname || 'local-page',
  };
}

function restoreSession(jobId: string): void {
  const saved = activeSessions.get(jobId);
  if (!saved) {
    return;
  }
  activeSessions.delete(jobId);

  try {
    saved.stickyManager.restoreAll();
    if (saved.innerContainer) {
      saved.innerContainer.scrollTo({
        left: saved.innerOrigScrollX,
        top: saved.innerOrigScrollY,
        behavior: 'instant',
      });
      if (saved.innerBehaviorValue.length > 0) {
        saved.innerContainer.style.setProperty(
          'scroll-behavior',
          saved.innerBehaviorValue,
          saved.innerBehaviorPriority,
        );
      } else {
        saved.innerContainer.style.removeProperty('scroll-behavior');
      }
    }

    window.scrollTo({
      left: saved.origScrollX,
      top: saved.origScrollY,
      behavior: 'instant',
    });

    const docEl = document.documentElement;
    if (saved.docBehaviorValue.length > 0) {
      docEl.style.setProperty('scroll-behavior', saved.docBehaviorValue, saved.docBehaviorPriority);
    } else {
      docEl.style.removeProperty('scroll-behavior');
    }

    const body = document.body as HTMLElement | null;
    if (body) {
      if (saved.bodyBehaviorValue.length > 0) {
        body.style.setProperty(
          'scroll-behavior',
          saved.bodyBehaviorValue,
          saved.bodyBehaviorPriority,
        );
      } else {
        body.style.removeProperty('scroll-behavior');
      }
    }
  } catch {
    // Best-effort cleanup if page is navigating away
  }
}

async function handleStartRegionSelect(jobId: string): Promise<void> {
  if (activeSelection !== null) {
    activeSelection.session.cancel();
    activeSelection = null;
  }

  const prefs = await loadExportPreferences();
  setPreferredLocale(prefs.locale);

  const session = startRegionSelection(
    {
      hintDrag: t('overlay_hint_drag', 'Drag to select an area'),
      hintEsc: t('overlay_hint_esc', 'Esc to cancel'),
      cancelLabel: t('overlay_btn_cancel', 'Cancel'),
      dir: getTextDirection(),
    },
    () => {
      const dims = getPageDimensions();
      return { widthCss: dims.pageWidthCss, heightCss: dims.pageHeightCss };
    },
  );

  activeSelection = { jobId, session };

  void session.promise.then((regionCss) => {
    if (activeSelection?.jobId === jobId) {
      activeSelection = null;
    }
    if (regionCss === null) {
      chrome.runtime.sendMessage({ action: 'REGION_CANCELLED', jobId }, () => {
        if (chrome.runtime.lastError) {
          return;
        }
      });
      return;
    }
    chrome.runtime.sendMessage({ action: 'REGION_SELECTED', jobId, regionCss }, () => {
      if (chrome.runtime.lastError) {
        return;
      }
    });
  });
}

const LISTENER_FLAG = '__wssCaptureListenerRegistered';

export default defineUnlistedScript(() => {
  const globalRecord = globalThis as Record<string, unknown>;
  if (globalRecord[LISTENER_FLAG] === true) {
    return;
  }
  globalRecord[LISTENER_FLAG] = true;

  chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id || !isValidExtensionMessage(message)) {
      return false;
    }

    switch (message.action) {
      case 'START_REGION_SELECT': {
        void handleStartRegionSelect(message.jobId).then(() => {
          sendResponse({ ok: true });
        });
        return true;
      }

      case 'CANCEL_REGION_SELECT': {
        if (activeSelection?.jobId === message.jobId) {
          activeSelection.session.cancel();
          activeSelection = null;
        }
        sendResponse({ ok: true });
        return false;
      }

      case 'PREPARE_CAPTURE': {
        try {
          const result = prepareSession(message.jobId, message.regionCss);
          sendResponse({ ok: true, ...result });
        } catch (err: unknown) {
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : 'PREPARE_CAPTURE failed',
          });
        }
        return false;
      }

      case 'SCROLL_TO_STEP': {
        const session = activeSessions.get(message.jobId);
        if (!session) {
          sendResponse({ ok: false, error: 'Missing active capture session' });
          return false;
        }

        if (session.innerContainer) {
          session.innerContainer.scrollTo({
            left: message.step.scrollXCss,
            top: message.step.scrollYCss,
            behavior: 'instant',
          });
        } else {
          window.scrollTo({
            left: message.step.scrollXCss,
            top: message.step.scrollYCss,
            behavior: 'instant',
          });
        }

        session.stickyManager.suppressAfterFirstTile(
          message.step.scrollXCss,
          message.step.scrollYCss,
        );

        void settleViewportPaint().then(() => {
          sendResponse({
            ok: true,
            actualScrollXCss: session.innerContainer
              ? session.innerContainer.scrollLeft
              : window.scrollX,
            actualScrollYCss: session.innerContainer
              ? session.innerContainer.scrollTop
              : window.scrollY,
          });
        });
        return true;
      }

      case 'RESTORE_PAGE':
        restoreSession(message.jobId);
        sendResponse({ ok: true });
        return false;

      default:
        return false;
    }
  });
});

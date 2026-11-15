import { CaptureRateLimiter } from '../capture/rate-limiter';
import { isRestrictedPageUrl } from '../capture/restricted-url';
import type { CapturePlan, CssRect } from '../capture/scroll-planner';
import {
  type CaptureStatusSnapshot,
  isValidExtensionMessage,
  type StitchedPartOutput,
} from '../messaging/protocol';
import type { CaptureMode } from '../shared/constants';
import { CaptureError, type CaptureErrorCode } from '../shared/errors';

interface PrepareResponse {
  readonly ok: boolean;
  readonly plan?: CapturePlan;
  readonly hostname?: string;
  readonly error?: string;
}

interface ScrollStepResponse {
  readonly ok: boolean;
  readonly actualScrollXCss?: number;
  readonly actualScrollYCss?: number;
  readonly error?: string;
}

interface OffscreenOkResponse {
  readonly ok: boolean;
  readonly error?: string;
}

interface FinalizeResponse {
  readonly ok: boolean;
  readonly parts?: readonly StitchedPartOutput[];
  readonly error?: string;
}

interface ActiveJob {
  readonly jobId: string;
  readonly tabId: number;
  readonly mode: CaptureMode;
  cancelled: boolean;
  phase: 'selecting' | 'capturing';
}

interface PendingRegionRecord {
  readonly jobId: string;
  readonly tabId: number;
}

const PENDING_REGION_KEY = 'wss_pending_region_job';

const IDLE_STATE: CaptureStatusSnapshot = {
  status: 'idle',
  completed: 0,
  total: 0,
};

let currentState: CaptureStatusSnapshot = IDLE_STATE;
let activeJob: ActiveJob | null = null;
const rateLimiter = new CaptureRateLimiter();

function isCancelled(job: ActiveJob): boolean {
  return job.cancelled;
}

function broadcastState(next: CaptureStatusSnapshot): void {
  currentState = next;
  chrome.runtime.sendMessage({ action: 'CAPTURE_STATE', state: next }, () => {
    if (chrome.runtime.lastError) {
      return;
    }
  });
}

async function savePendingRegionJob(record: PendingRegionRecord): Promise<void> {
  await chrome.storage.session.set({ [PENDING_REGION_KEY]: record });
}

async function clearPendingRegionJob(): Promise<void> {
  await chrome.storage.session.remove(PENDING_REGION_KEY);
}

async function loadPendingRegionJob(): Promise<PendingRegionRecord | null> {
  const stored = await chrome.storage.session.get(PENDING_REGION_KEY);
  const raw: unknown = stored[PENDING_REGION_KEY];
  if (
    typeof raw === 'object' &&
    raw !== null &&
    typeof (raw as Record<string, unknown>)['jobId'] === 'string' &&
    typeof (raw as Record<string, unknown>)['tabId'] === 'number'
  ) {
    return raw as PendingRegionRecord;
  }
  return null;
}

async function ensureOffscreenDocument(): Promise<void> {
  const existing = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
  });
  if (existing.length > 0) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: [chrome.offscreen.Reason.BLOBS],
    justification:
      'Stitch High-DPI viewport screenshots using OffscreenCanvas and export PNG blobs',
  });
}

async function sendRuntimeMessage<T>(payload: unknown): Promise<T> {
  const result: unknown = await chrome.runtime.sendMessage(payload);
  return result as T;
}

async function sendTabMessage<T>(tabId: number, payload: unknown): Promise<T> {
  const result: unknown = await chrome.tabs.sendMessage(tabId, payload);
  return result as T;
}

function waitForDownloadComplete(downloadId: number): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      chrome.downloads.onChanged.removeListener(onChanged);
      clearTimeout(timer);
      resolve();
    };

    const onChanged = (delta: chrome.downloads.DownloadDelta): void => {
      if (delta.id !== downloadId) {
        return;
      }
      const state = delta.state?.current;
      if (state === 'complete' || state === 'interrupted') {
        finish();
      }
    };

    chrome.downloads.onChanged.addListener(onChanged);
    const timer = setTimeout(finish, 15_000);
  });
}

async function resolveTargetTab(targetTabId?: number): Promise<chrome.tabs.Tab> {
  if (targetTabId !== undefined) {
    return await chrome.tabs.get(targetTabId);
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    throw new CaptureError('TAB_CLOSED', 'No active tab available');
  }
  return tab;
}

function toCaptureError(error: unknown): { code: CaptureErrorCode; message: string } {
  if (error instanceof CaptureError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes('cannot access') ||
      msg.includes('restricted') ||
      msg.includes('extensions gallery')
    ) {
      return { code: 'RESTRICTED_PAGE', message: error.message };
    }
    return { code: 'UNKNOWN', message: error.message };
  }
  return { code: 'UNKNOWN', message: 'Unknown capture failure' };
}

async function executeCapturePipeline(job: ActiveJob, regionCss?: CssRect): Promise<void> {
  const { jobId, tabId, mode } = job;
  let contentPrepared = false;
  let offscreenInitialized = false;

  try {
    broadcastState({ status: 'capturing', mode, completed: 0, total: 1 });

    const preparePayload =
      regionCss !== undefined
        ? { action: 'PREPARE_CAPTURE', jobId, mode, regionCss }
        : { action: 'PREPARE_CAPTURE', jobId, mode };

    const prepared = await sendTabMessage<PrepareResponse>(tabId, preparePayload);
    if (!prepared.ok || !prepared.plan) {
      throw new CaptureError('UNKNOWN', prepared.error ?? 'Failed to prepare page for capture');
    }
    contentPrepared = true;

    const { plan } = prepared;
    const hostname = prepared.hostname ?? 'capture';

    await ensureOffscreenDocument();
    const initRes = await sendRuntimeMessage<OffscreenOkResponse>({
      action: 'INIT_STITCH_JOB',
      jobId,
      plan,
    });
    if (!initRes.ok) {
      throw new CaptureError('CANVAS_LIMIT', initRes.error ?? 'Failed to initialize stitch job');
    }
    offscreenInitialized = true;

    const total = plan.steps.length;
    broadcastState({ status: 'capturing', mode, completed: 0, total });

    for (const step of plan.steps) {
      if (isCancelled(job)) {
        throw new CaptureError('USER_CANCELLED', 'Capture cancelled by user');
      }

      const scrollRes = await sendTabMessage<ScrollStepResponse>(tabId, {
        action: 'SCROLL_TO_STEP',
        jobId,
        step,
      });
      if (!scrollRes.ok) {
        throw new CaptureError('UNKNOWN', scrollRes.error ?? 'Failed to scroll tab');
      }

      if (isCancelled(job)) {
        throw new CaptureError('USER_CANCELLED', 'Capture cancelled by user');
      }

      const tileDataUrl = await rateLimiter.execute(() =>
        chrome.tabs.captureVisibleTab({ format: 'png' }),
      );

      const stitchRes = await sendRuntimeMessage<OffscreenOkResponse>({
        action: 'STITCH_TILE',
        jobId,
        step,
        actualScrollXCss: scrollRes.actualScrollXCss ?? step.scrollXCss,
        actualScrollYCss: scrollRes.actualScrollYCss ?? step.scrollYCss,
        tileDataUrl,
      });
      if (!stitchRes.ok) {
        throw new CaptureError('CANVAS_LIMIT', stitchRes.error ?? 'Failed to stitch tile');
      }

      broadcastState({ status: 'capturing', mode, completed: step.stepIndex + 1, total });
    }

    if (isCancelled(job)) {
      throw new CaptureError('USER_CANCELLED', 'Capture cancelled by user');
    }

    broadcastState({ status: 'stitching', mode, completed: total, total });
    const finalized = await sendRuntimeMessage<FinalizeResponse>({
      action: 'FINALIZE_STITCH_JOB',
      jobId,
      hostname,
    });
    offscreenInitialized = false;

    if (!finalized.ok || !finalized.parts || finalized.parts.length === 0) {
      throw new CaptureError('CANVAS_LIMIT', finalized.error ?? 'Failed to finalize PNG output');
    }

    const partUrls = finalized.parts.map((part) => part.objectUrl);
    try {
      for (const part of finalized.parts) {
        const downloadId = await chrome.downloads.download({
          url: part.objectUrl,
          filename: part.filename,
          saveAs: false,
        });
        await waitForDownloadComplete(downloadId);
      }
    } finally {
      await sendRuntimeMessage<OffscreenOkResponse>({
        action: 'REVOKE_PART_URLS',
        urls: partUrls,
      }).catch(() => undefined);
    }

    broadcastState({
      status: 'done',
      mode,
      completed: total,
      total,
      downloadedCount: finalized.parts.length,
    });
  } catch (err: unknown) {
    if (offscreenInitialized) {
      await sendRuntimeMessage({ action: 'ABORT_STITCH_JOB', jobId }).catch(() => undefined);
    }

    const { code, message } = toCaptureError(err);
    if (code === 'USER_CANCELLED') {
      broadcastState({ status: 'cancelled', mode, completed: 0, total: 0 });
    } else {
      broadcastState({
        status: 'error',
        mode,
        completed: 0,
        total: 0,
        errorCode: code,
        errorMessage: message,
      });
    }
  } finally {
    if (contentPrepared) {
      await sendTabMessage(tabId, { action: 'RESTORE_PAGE', jobId }).catch(() => undefined);
    }
    if (activeJob?.jobId === jobId) {
      activeJob = null;
    }
  }
}

async function startCaptureJob(mode: CaptureMode, targetTabId?: number): Promise<void> {
  if (activeJob !== null) {
    return;
  }

  try {
    const tab = await resolveTargetTab(targetTabId);
    if (tab.id === undefined || isRestrictedPageUrl(tab.url)) {
      throw new CaptureError('RESTRICTED_PAGE', 'Cannot capture browser or store system pages');
    }

    const tabId = tab.id;
    if (!tab.active) {
      await chrome.tabs.update(tabId, { active: true });
    }

    const jobId = crypto.randomUUID();
    const job: ActiveJob = {
      jobId,
      tabId,
      mode,
      cancelled: false,
      phase: mode === 'region' ? 'selecting' : 'capturing',
    };
    activeJob = job;

    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['capture-content.js'],
    });

    if (mode === 'full') {
      await executeCapturePipeline(job);
      return;
    }

    await savePendingRegionJob({ jobId, tabId });
    broadcastState({ status: 'selecting', mode: 'region', completed: 0, total: 1 });
    const startRes = await sendTabMessage<OffscreenOkResponse>(tabId, {
      action: 'START_REGION_SELECT',
      jobId,
    });
    if (!startRes.ok) {
      throw new CaptureError('UNKNOWN', startRes.error ?? 'Failed to start region selection');
    }
  } catch (err: unknown) {
    await clearPendingRegionJob().catch(() => undefined);
    activeJob = null;
    const { code, message } = toCaptureError(err);
    broadcastState({
      status: 'error',
      mode,
      completed: 0,
      total: 0,
      errorCode: code,
      errorMessage: message,
    });
  }
}

async function handleRegionSelected(
  jobId: string,
  regionCss: CssRect,
  senderTabId?: number,
): Promise<void> {
  let job = activeJob;
  if (job?.jobId !== jobId) {
    const pending = await loadPendingRegionJob();
    if (pending?.jobId !== jobId) {
      return;
    }
    if (senderTabId !== undefined && senderTabId !== pending.tabId) {
      return;
    }
    job = {
      jobId,
      tabId: pending.tabId,
      mode: 'region',
      cancelled: false,
      phase: 'capturing',
    };
    activeJob = job;
  } else if (senderTabId !== undefined && senderTabId !== job.tabId) {
    return;
  }

  await clearPendingRegionJob().catch(() => undefined);
  if (job.cancelled) {
    if (activeJob?.jobId === jobId) {
      activeJob = null;
    }
    return;
  }

  job.phase = 'capturing';
  await executeCapturePipeline(job, regionCss);
}

async function handleRegionCancelled(jobId: string, senderTabId?: number): Promise<void> {
  const pending = await loadPendingRegionJob();
  const expectedTabId = activeJob?.jobId === jobId ? activeJob.tabId : pending?.tabId;
  if (expectedTabId === undefined) {
    return;
  }
  if (senderTabId !== undefined && senderTabId !== expectedTabId) {
    return;
  }

  await clearPendingRegionJob().catch(() => undefined);
  if (activeJob?.jobId === jobId) {
    activeJob = null;
  }
  broadcastState({ status: 'cancelled', mode: 'region', completed: 0, total: 0 });
}

export default defineBackground(() => {
  chrome.tabs.onRemoved.addListener((closedTabId) => {
    if (activeJob?.tabId === closedTabId && activeJob.phase === 'selecting') {
      const cancelledMode = activeJob.mode;
      activeJob.cancelled = true;
      activeJob = null;
      void clearPendingRegionJob().catch(() => undefined);
      broadcastState({ status: 'cancelled', mode: cancelledMode, completed: 0, total: 0 });
    }
  });

  chrome.commands.onCommand.addListener((command) => {
    if (activeJob !== null) {
      return;
    }
    if (command === 'capture-full-page') {
      void startCaptureJob('full');
    } else if (command === 'capture-region') {
      void startCaptureJob('region');
    }
  });

  chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) {
      return false;
    }
    if (!isValidExtensionMessage(message)) {
      return false;
    }

    switch (message.action) {
      case 'GET_CAPTURE_STATE':
        sendResponse({ ok: true, state: currentState });
        return false;

      case 'CANCEL_CAPTURE':
        if (activeJob) {
          const job = activeJob;
          job.cancelled = true;
          if (job.phase === 'selecting') {
            activeJob = null;
            void clearPendingRegionJob().catch(() => undefined);
            void sendTabMessage(job.tabId, {
              action: 'CANCEL_REGION_SELECT',
              jobId: job.jobId,
            }).catch(() => undefined);
            broadcastState({ status: 'cancelled', mode: job.mode, completed: 0, total: 0 });
          }
        }
        sendResponse({ ok: true });
        return false;

      case 'START_CAPTURE':
        if (activeJob !== null) {
          sendResponse({ ok: false, error: 'CAPTURE_IN_PROGRESS' });
          return false;
        }
        void startCaptureJob(message.mode, message.targetTabId);
        sendResponse({ ok: true });
        return false;

      case 'REGION_SELECTED':
        void handleRegionSelected(message.jobId, message.regionCss, sender.tab?.id);
        sendResponse({ ok: true });
        return false;

      case 'REGION_CANCELLED':
        void handleRegionCancelled(message.jobId, sender.tab?.id);
        sendResponse({ ok: true });
        return false;

      default:
        return false;
    }
  });
});

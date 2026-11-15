import type { CapturePlan, CaptureStep, CssRect } from '../capture/scroll-planner';
import type { CaptureMode } from '../shared/constants';
import type { CaptureErrorCode } from '../shared/errors';

export interface PixelRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CaptureStatusSnapshot {
  readonly status:
    'idle' | 'selecting' | 'capturing' | 'stitching' | 'done' | 'error' | 'cancelled';
  readonly mode?: CaptureMode;
  readonly completed: number;
  readonly total: number;
  readonly errorCode?: CaptureErrorCode;
  readonly errorMessage?: string;
  readonly downloadedCount?: number;
}

export interface StitchedPartOutput {
  readonly objectUrl: string;
  readonly filename: string;
  readonly widthPx: number;
  readonly heightPx: number;
}

export type ExtensionMessage =
  | {
      readonly action: 'START_CAPTURE';
      readonly mode: CaptureMode;
      readonly targetTabId?: number;
    }
  | {
      readonly action: 'CANCEL_CAPTURE';
    }
  | {
      readonly action: 'GET_CAPTURE_STATE';
    }
  | {
      readonly action: 'CAPTURE_STATE';
      readonly state: CaptureStatusSnapshot;
    }
  | {
      readonly action: 'PREPARE_CAPTURE';
      readonly jobId: string;
      readonly mode: CaptureMode;
      readonly regionCss?: CssRect;
    }
  | {
      readonly action: 'START_REGION_SELECT';
      readonly jobId: string;
    }
  | {
      readonly action: 'CANCEL_REGION_SELECT';
      readonly jobId: string;
    }
  | {
      readonly action: 'REGION_SELECTED';
      readonly jobId: string;
      readonly regionCss: CssRect;
    }
  | {
      readonly action: 'REGION_CANCELLED';
      readonly jobId: string;
    }
  | {
      readonly action: 'SCROLL_TO_STEP';
      readonly jobId: string;
      readonly step: CaptureStep;
    }
  | {
      readonly action: 'RESTORE_PAGE';
      readonly jobId: string;
    }
  | {
      readonly action: 'PING_OFFSCREEN';
    }
  | {
      readonly action: 'INIT_STITCH_JOB';
      readonly jobId: string;
      readonly plan: CapturePlan;
    }
  | {
      readonly action: 'STITCH_TILE';
      readonly jobId: string;
      readonly step: CaptureStep;
      readonly actualScrollXCss: number;
      readonly actualScrollYCss: number;
      readonly tileDataUrl: string;
    }
  | {
      readonly action: 'FINALIZE_STITCH_JOB';
      readonly jobId: string;
      readonly hostname: string;
    }
  | {
      readonly action: 'ABORT_STITCH_JOB';
      readonly jobId: string;
    }
  | {
      readonly action: 'REVOKE_PART_URLS';
      readonly urls: readonly string[];
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNonNeg(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isPositiveFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isCssRect(value: unknown): value is CssRect {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isFiniteNonNeg(value['x']) &&
    isFiniteNonNeg(value['y']) &&
    isPositiveFinite(value['width']) &&
    isPositiveFinite(value['height'])
  );
}

function isCaptureStep(value: unknown): value is CaptureStep {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isFiniteNonNeg(value['stepIndex']) &&
    isFiniteNonNeg(value['scrollXCss']) &&
    isFiniteNonNeg(value['scrollYCss']) &&
    isFiniteNonNeg(value['targetStartXCss']) &&
    isFiniteNonNeg(value['targetStartYCss']) &&
    isPositiveFinite(value['coveredWidthCss']) &&
    isPositiveFinite(value['coveredHeightCss'])
  );
}

export function isValidExtensionMessage(value: unknown): value is ExtensionMessage {
  if (!isRecord(value) || typeof value['action'] !== 'string') {
    return false;
  }

  switch (value['action']) {
    case 'START_CAPTURE': {
      const validMode = value['mode'] === 'full' || value['mode'] === 'region';
      const tabId = value['targetTabId'];
      const validTabId =
        tabId === undefined || (typeof tabId === 'number' && Number.isInteger(tabId) && tabId > 0);
      return validMode && validTabId;
    }
    case 'CANCEL_CAPTURE':
    case 'GET_CAPTURE_STATE':
    case 'PING_OFFSCREEN':
      return true;
    case 'CAPTURE_STATE':
      return isRecord(value['state']) && typeof value['state']['status'] === 'string';
    case 'PREPARE_CAPTURE':
      return (
        typeof value['jobId'] === 'string' &&
        value['jobId'].length > 0 &&
        (value['mode'] === 'full' || value['mode'] === 'region') &&
        (value['regionCss'] === undefined || isCssRect(value['regionCss']))
      );
    case 'START_REGION_SELECT':
    case 'CANCEL_REGION_SELECT':
    case 'REGION_CANCELLED':
      return typeof value['jobId'] === 'string' && value['jobId'].length > 0;
    case 'REGION_SELECTED':
      return (
        typeof value['jobId'] === 'string' &&
        value['jobId'].length > 0 &&
        isCssRect(value['regionCss'])
      );
    case 'SCROLL_TO_STEP':
      return (
        typeof value['jobId'] === 'string' &&
        value['jobId'].length > 0 &&
        isCaptureStep(value['step'])
      );
    case 'RESTORE_PAGE':
    case 'ABORT_STITCH_JOB':
      return typeof value['jobId'] === 'string' && value['jobId'].length > 0;
    case 'INIT_STITCH_JOB':
      return (
        typeof value['jobId'] === 'string' &&
        value['jobId'].length > 0 &&
        isRecord(value['plan']) &&
        Array.isArray(value['plan']['chunks']) &&
        Array.isArray(value['plan']['steps'])
      );
    case 'STITCH_TILE':
      return (
        typeof value['jobId'] === 'string' &&
        value['jobId'].length > 0 &&
        isCaptureStep(value['step']) &&
        isFiniteNonNeg(value['actualScrollXCss']) &&
        isFiniteNonNeg(value['actualScrollYCss']) &&
        typeof value['tileDataUrl'] === 'string' &&
        value['tileDataUrl'].startsWith('data:image/')
      );
    case 'FINALIZE_STITCH_JOB':
      return (
        typeof value['jobId'] === 'string' &&
        value['jobId'].length > 0 &&
        typeof value['hostname'] === 'string'
      );
    case 'REVOKE_PART_URLS':
      return (
        Array.isArray(value['urls']) &&
        value['urls'].every((u) => typeof u === 'string' && u.startsWith('blob:'))
      );
    default:
      return false;
  }
}

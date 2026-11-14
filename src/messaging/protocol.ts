import type { CaptureMode } from '../shared/constants';

export interface PixelRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type ExtensionMessage =
  | {
      readonly action: 'START_CAPTURE';
      readonly mode: CaptureMode;
    }
  | {
      readonly action: 'CANCEL_CAPTURE';
    }
  | {
      readonly action: 'CAPTURE_PROGRESS';
      readonly completed: number;
      readonly total: number;
    }
  | {
      readonly action: 'PING_OFFSCREEN';
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isValidExtensionMessage(value: unknown): value is ExtensionMessage {
  if (!isRecord(value) || typeof value['action'] !== 'string') {
    return false;
  }

  switch (value['action']) {
    case 'START_CAPTURE':
      return value['mode'] === 'full' || value['mode'] === 'region';
    case 'CANCEL_CAPTURE':
    case 'PING_OFFSCREEN':
      return true;
    case 'CAPTURE_PROGRESS':
      return (
        typeof value['completed'] === 'number' &&
        Number.isFinite(value['completed']) &&
        value['completed'] >= 0 &&
        typeof value['total'] === 'number' &&
        Number.isFinite(value['total']) &&
        value['total'] > 0
      );
    default:
      return false;
  }
}

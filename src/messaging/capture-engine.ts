import type { CaptureMode } from '../shared/constants';

export interface CaptureOptions {
  readonly tabId: number;
  readonly mode: CaptureMode;
}

export interface CaptureResultSummary {
  readonly jobId: string;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly dpr: number;
  readonly partCount: number;
}

export interface CaptureEngine {
  readonly name: string;
  capture(options: CaptureOptions): Promise<CaptureResultSummary>;
  cancel(tabId: number): Promise<void>;
}

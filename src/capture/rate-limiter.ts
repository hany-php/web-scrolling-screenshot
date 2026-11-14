import { CAPTURE_MIN_INTERVAL_MS } from '../shared/constants';
import { CaptureError } from '../shared/errors';

export interface RateLimiterOptions {
  readonly minIntervalMs?: number;
  readonly maxRetries?: number;
  readonly now?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return (
    error.message.includes('MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND') ||
    error.message.toLowerCase().includes('quota')
  );
}

export class CaptureRateLimiter {
  private readonly minIntervalMs: number;
  private readonly maxRetries: number;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private lastCaptureAtMs = -Infinity;

  public constructor(options: RateLimiterOptions = {}) {
    this.minIntervalMs = options.minIntervalMs ?? CAPTURE_MIN_INTERVAL_MS;
    this.maxRetries = options.maxRetries ?? 3;
    this.now = options.now ?? (() => Date.now());
    this.sleep = options.sleep ?? defaultSleep;
  }

  public async execute<T>(captureFn: () => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const elapsed = this.now() - this.lastCaptureAtMs;
      if (elapsed < this.minIntervalMs) {
        await this.sleep(this.minIntervalMs - elapsed);
      }

      this.lastCaptureAtMs = this.now();
      try {
        return await captureFn();
      } catch (error: unknown) {
        if (!isQuotaError(error) || attempt === this.maxRetries) {
          if (isQuotaError(error)) {
            throw new CaptureError(
              'CAPTURE_RATE_LIMIT',
              'Exceeded browser captureVisibleTab quota after retries',
            );
          }
          throw error;
        }
        const backoffMs = this.minIntervalMs * (attempt + 2);
        await this.sleep(backoffMs);
      }
    }

    throw new CaptureError('CAPTURE_RATE_LIMIT', 'Capture rate limit exhausted');
  }
}

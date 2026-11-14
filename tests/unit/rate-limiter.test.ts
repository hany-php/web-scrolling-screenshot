import { describe, expect, it } from 'vitest';
import { CaptureRateLimiter } from '../../src/capture/rate-limiter';
import { CaptureError } from '../../src/shared/errors';

describe('CaptureRateLimiter', () => {
  it('enforces minimum interval between sequential captures', async () => {
    let clock = 1000;
    const sleeps: number[] = [];
    const limiter = new CaptureRateLimiter({
      minIntervalMs: 550,
      now: () => clock,
      sleep: (ms) => {
        sleeps.push(ms);
        clock += ms;
        return Promise.resolve();
      },
    });

    await limiter.execute(() => Promise.resolve('frame-1'));
    clock += 100;
    await limiter.execute(() => Promise.resolve('frame-2'));

    expect(sleeps).toEqual([450]);
  });

  it('retries on MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND and succeeds', async () => {
    let clock = 0;
    let attempts = 0;
    const limiter = new CaptureRateLimiter({
      minIntervalMs: 100,
      maxRetries: 2,
      now: () => clock,
      sleep: (ms) => {
        clock += ms;
        return Promise.resolve();
      },
    });

    const result = await limiter.execute(() => {
      attempts += 1;
      if (attempts < 2) {
        return Promise.reject(new Error('MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND exceeded'));
      }
      return Promise.resolve('ok');
    });

    expect(result).toBe('ok');
    expect(attempts).toBe(2);
  });

  it('throws CaptureError after exhausting quota retries', async () => {
    let clock = 0;
    const limiter = new CaptureRateLimiter({
      minIntervalMs: 50,
      maxRetries: 1,
      now: () => clock,
      sleep: (ms) => {
        clock += ms;
        return Promise.resolve();
      },
    });

    await expect(
      limiter.execute(() =>
        Promise.reject(new Error('MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND exceeded')),
      ),
    ).rejects.toBeInstanceOf(CaptureError);
  });
});

import { describe, expect, it } from 'vitest';
import { isValidExtensionMessage } from '../../src/messaging/protocol';

describe('isValidExtensionMessage', () => {
  it('accepts valid protocol messages', () => {
    expect(isValidExtensionMessage({ action: 'START_CAPTURE', mode: 'full' })).toBe(true);
    expect(
      isValidExtensionMessage({ action: 'START_CAPTURE', mode: 'region', targetTabId: 42 }),
    ).toBe(true);
    expect(isValidExtensionMessage({ action: 'CANCEL_CAPTURE' })).toBe(true);
    expect(isValidExtensionMessage({ action: 'GET_CAPTURE_STATE' })).toBe(true);
    expect(isValidExtensionMessage({ action: 'PING_OFFSCREEN' })).toBe(true);
    expect(
      isValidExtensionMessage({
        action: 'PREPARE_CAPTURE',
        jobId: 'job-1',
        mode: 'full',
      }),
    ).toBe(true);
    expect(
      isValidExtensionMessage({
        action: 'SCROLL_TO_STEP',
        jobId: 'job-1',
        step: {
          stepIndex: 0,
          scrollXCss: 0,
          scrollYCss: 0,
          targetStartXCss: 0,
          targetStartYCss: 0,
          coveredWidthCss: 1280,
          coveredHeightCss: 800,
        },
      }),
    ).toBe(true);
    expect(
      isValidExtensionMessage({
        action: 'STITCH_TILE',
        jobId: 'job-1',
        step: {
          stepIndex: 0,
          scrollXCss: 0,
          scrollYCss: 0,
          targetStartXCss: 0,
          targetStartYCss: 0,
          coveredWidthCss: 1280,
          coveredHeightCss: 800,
        },
        actualScrollXCss: 0,
        actualScrollYCss: 0,
        tileDataUrl: 'data:image/png;base64,AAAA',
      }),
    ).toBe(true);
    expect(
      isValidExtensionMessage({
        action: 'PREPARE_CAPTURE',
        jobId: 'job-1',
        mode: 'region',
        regionCss: { x: 10, y: 20, width: 300, height: 200 },
      }),
    ).toBe(true);
    expect(isValidExtensionMessage({ action: 'START_REGION_SELECT', jobId: 'job-2' })).toBe(true);
    expect(isValidExtensionMessage({ action: 'CANCEL_REGION_SELECT', jobId: 'job-2' })).toBe(true);
    expect(isValidExtensionMessage({ action: 'REGION_CANCELLED', jobId: 'job-2' })).toBe(true);
    expect(
      isValidExtensionMessage({
        action: 'REGION_SELECTED',
        jobId: 'job-2',
        regionCss: { x: 0, y: 0, width: 100, height: 500 },
      }),
    ).toBe(true);
    expect(
      isValidExtensionMessage({
        action: 'REVOKE_PART_URLS',
        urls: ['blob:chrome-extension://abc/123'],
      }),
    ).toBe(true);
  });

  it('rejects malformed or unknown payloads', () => {
    expect(isValidExtensionMessage(null)).toBe(false);
    expect(isValidExtensionMessage('START_CAPTURE')).toBe(false);
    expect(isValidExtensionMessage({ action: 'START_CAPTURE', mode: 'invalid' })).toBe(false);
    expect(
      isValidExtensionMessage({ action: 'START_CAPTURE', mode: 'full', targetTabId: -5 }),
    ).toBe(false);
    expect(
      isValidExtensionMessage({
        action: 'STITCH_TILE',
        jobId: 'job-1',
        step: {
          stepIndex: 0,
          scrollXCss: 0,
          scrollYCss: 0,
          targetStartXCss: 0,
          targetStartYCss: 0,
          coveredWidthCss: 1280,
          coveredHeightCss: 800,
        },
        actualScrollXCss: 0,
        actualScrollYCss: 0,
        tileDataUrl: 'https://evil.example.com/steal.png',
      }),
    ).toBe(false);
    expect(
      isValidExtensionMessage({
        action: 'PREPARE_CAPTURE',
        jobId: 'job-1',
        mode: 'region',
        regionCss: { x: 10, y: 20, width: 300, height: 200 },
      }),
    ).toBe(true);
    expect(isValidExtensionMessage({ action: 'START_REGION_SELECT', jobId: 'job-2' })).toBe(true);
    expect(isValidExtensionMessage({ action: 'CANCEL_REGION_SELECT', jobId: 'job-2' })).toBe(true);
    expect(isValidExtensionMessage({ action: 'REGION_CANCELLED', jobId: 'job-2' })).toBe(true);
    expect(
      isValidExtensionMessage({
        action: 'REGION_SELECTED',
        jobId: 'job-2',
        regionCss: { x: 0, y: 0, width: 100, height: 500 },
      }),
    ).toBe(true);
    expect(
      isValidExtensionMessage({
        action: 'REVOKE_PART_URLS',
        urls: ['https://example.com/not-a-blob'],
      }),
    ).toBe(false);
    expect(
      isValidExtensionMessage({
        action: 'PREPARE_CAPTURE',
        jobId: 'job-1',
        mode: 'region',
        regionCss: { x: 0, y: 0, width: 0, height: 100 },
      }),
    ).toBe(false);
    expect(
      isValidExtensionMessage({
        action: 'REGION_SELECTED',
        jobId: 'job-2',
        regionCss: { x: -1, y: 0, width: 100, height: 100 },
      }),
    ).toBe(false);
    expect(isValidExtensionMessage({ action: 'UNKNOWN_ACTION' })).toBe(false);
  });
});

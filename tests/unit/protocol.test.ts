import { describe, expect, it } from 'vitest';
import { isValidExtensionMessage } from '../../src/messaging/protocol';

describe('isValidExtensionMessage', () => {
  it('accepts valid protocol messages', () => {
    expect(isValidExtensionMessage({ action: 'START_CAPTURE', mode: 'full' })).toBe(true);
    expect(isValidExtensionMessage({ action: 'START_CAPTURE', mode: 'region' })).toBe(true);
    expect(isValidExtensionMessage({ action: 'CANCEL_CAPTURE' })).toBe(true);
    expect(isValidExtensionMessage({ action: 'PING_OFFSCREEN' })).toBe(true);
    expect(isValidExtensionMessage({ action: 'CAPTURE_PROGRESS', completed: 2, total: 5 })).toBe(
      true,
    );
  });

  it('rejects malformed or unknown payloads', () => {
    expect(isValidExtensionMessage(null)).toBe(false);
    expect(isValidExtensionMessage('START_CAPTURE')).toBe(false);
    expect(isValidExtensionMessage({ action: 'START_CAPTURE', mode: 'invalid' })).toBe(false);
    expect(isValidExtensionMessage({ action: 'CAPTURE_PROGRESS', completed: -1, total: 5 })).toBe(
      false,
    );
    expect(isValidExtensionMessage({ action: 'CAPTURE_PROGRESS', completed: 0, total: 0 })).toBe(
      false,
    );
    expect(isValidExtensionMessage({ action: 'UNKNOWN_ACTION' })).toBe(false);
  });
});

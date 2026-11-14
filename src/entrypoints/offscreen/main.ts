import { isValidExtensionMessage } from '../../messaging/protocol';

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || !isValidExtensionMessage(message)) {
    return false;
  }

  if (message.action === 'PING_OFFSCREEN') {
    const supported = typeof OffscreenCanvas !== 'undefined';
    sendResponse({ ok: supported });
    return false;
  }

  return false;
});

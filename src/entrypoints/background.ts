import { isValidExtensionMessage } from '../messaging/protocol';

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) {
      sendResponse({ ok: false, error: 'UNAUTHORIZED_SENDER' });
      return false;
    }

    if (!isValidExtensionMessage(message)) {
      sendResponse({ ok: false, error: 'INVALID_MESSAGE' });
      return false;
    }

    switch (message.action) {
      case 'START_CAPTURE':
        sendResponse({ ok: true, status: 'PHASE_0_SKELETON', mode: message.mode });
        return false;
      case 'CANCEL_CAPTURE':
        sendResponse({ ok: true });
        return false;
      case 'CAPTURE_PROGRESS':
      case 'PING_OFFSCREEN':
        sendResponse({ ok: true });
        return false;
    }
  });
});

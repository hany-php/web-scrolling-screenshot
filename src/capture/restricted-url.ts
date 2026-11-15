const RESTRICTED_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'brave://',
  'about:',
  'view-source:',
  'devtools://',
];

const RESTRICTED_WEBSTORE_HOSTS = new Set([
  'chromewebstore.google.com',
  'chrome.google.com',
  'microsoftedge.microsoft.com',
]);

export function isRestrictedPageUrl(rawUrl: string | undefined): boolean {
  if (!rawUrl || rawUrl.trim().length === 0) {
    return true;
  }

  const lower = rawUrl.trim().toLowerCase();
  if (RESTRICTED_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
    return true;
  }

  try {
    const parsed = new URL(rawUrl);
    if (RESTRICTED_WEBSTORE_HOSTS.has(parsed.hostname.toLowerCase())) {
      if (parsed.hostname.toLowerCase() === 'chrome.google.com') {
        return parsed.pathname.startsWith('/webstore');
      }
      return true;
    }
    if (parsed.pathname.toLowerCase().endsWith('.pdf')) {
      return true;
    }
    return (
      parsed.protocol !== 'http:' && parsed.protocol !== 'https:' && parsed.protocol !== 'file:'
    );
  } catch {
    return true;
  }
}

# Security & Privacy — Web Scrolling Screenshot

## 1. Core Privacy Guarantee
Web Scrolling Screenshot operates **100% locally inside the user's browser**:
- **Zero network requests:** No backend server, no analytics/telemetry, no crash reporting SDKs, and no remote fonts or CDN scripts.
- **Ephemeral image storage:** Stitched screenshots live temporarily in extension-scoped `IndexedDB` solely to bridge the Offscreen Document and the Preview Tab, and are deleted immediately when the Preview Tab closes (plus orphaned-job cleanup on Service Worker startup).
- **Zero account or personal data collection:** Only local export preferences (default format and JPEG/WebP quality) are saved in `chrome.storage.local`.

## 2. Manifest V3 Least-Privilege Permissions
| Permission | Why Required | Alternative Rejected |
|---|---|---|
| `activeTab` | Grants temporary access to the active tab *only* when the user explicitly triggers a capture via Popup or shortcut | `<all_urls>` / `host_permissions` rejected — triggers Chrome Web Store broad-access warnings and violates least privilege |
| `scripting` | Injects the scroll orchestrator and Shadow DOM region selector on demand | Static `content_scripts` on `<all_urls>` rejected — runs unnecessarily on every visited page |
| `offscreen` | Hosts `OffscreenCanvas` in MV3 to stitch High-DPI frames without blocking the UI | Stitching inside host page DOM rejected (tainted canvas / CSP risks); Service Worker lacks `Canvas` |
| `downloads` | Saves exported PNG / JPEG / WebP files cleanly with sanitized filenames | Anchor `<a download>` only — lacks reliable Chrome download naming control across chunked parts |
| `storage` | Persists user format & quality defaults locally (`chrome.storage.local`) | `sync` storage unnecessary; `local` keeps all state on device |

> Adding any new permission (especially `debugger`, `tabs`, or host patterns) requires explicit owner approval, a privacy justification, and an ADR.

## 3. Threat Model & Controls
| Asset / Surface | Threat | Control |
|---|---|---|
| **Host Page DOM** | Malicious webpage tries to tamper with injected overlay or trick extension messages | Mount `SelectionOverlay` inside a **closed Shadow DOM** (`mode: 'closed'`); never trust DOM events or page `window.postMessage` — only `chrome.runtime` messages from verified extension sender IDs |
| **Cross-Context Messaging** | Spoofed or malformed payload sent to Background or Offscreen Document | Verify `sender.id === chrome.runtime.id` on all `onMessage` handlers; validate action names and numeric bounds (`width > 0`, `height > 0`, `dpr > 0`) via `messaging/protocol.ts` |
| **Filename Injection** | Host page `document.title` or URL hostname contains path traversal (`../`), null bytes, or OS-forbidden characters (`<>:"/\|?*`) | Sanitize all generated filenames strictly (`[a-zA-Z0-9_-]` allowlist, max 80 chars, fallback to `capture`) before calling `chrome.downloads.download` |
| **Extension CSP** | XSS via unsafe inline scripts or remote code | Enforce MV3 strict CSP (`script-src 'self'; object-src 'self'`); never use `eval`, `new Function`, `innerHTML` with untrusted page strings, or external scripts |
| **Supply Chain** | Compromised npm package injects network exfiltration | Pin exact package versions in `package.json`, commit `pnpm-lock.yaml`, keep zero external runtime network libs, run `pnpm audit` in CI |

## 4. Restricted Browser Pages
Pages where Chromium forbids extension injection (`chrome://`, `chrome-extension://`, `edge://`, `about:`, `view-source:`, Chrome Web Store `chrome.google.com/webstore` / `chromewebstore.google.com`, and local `file://` if user hasn't enabled file URL access) must be detected cleanly before injection and surface a localized, friendly `RESTRICTED_PAGE` explanation without throwing unhandled errors.

## 5. PR Security Checklist
- [ ] No new permissions or `host_permissions` added without owner approval + ADR
- [ ] No `fetch`, `XMLHttpRequest`, `WebSocket`, or `navigator.sendBeacon` calls anywhere in `src/`
- [ ] No `innerHTML` / `dangerouslySetInnerHTML` consuming host page text or titles
- [ ] Filenames sanitized before `chrome.downloads.download`
- [ ] `sender.id === chrome.runtime.id` checked on privileged message listeners

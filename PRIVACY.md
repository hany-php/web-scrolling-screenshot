# Privacy Policy — Web Scrolling Screenshot

**Effective Date:** 2026-11-15

**Web Scrolling Screenshot** does **not collect, store remotely, transmit, sell, or share any user data**.

## 100% Client-Side Processing

- **Zero External Network Requests:** All scrolling orchestration, frame stitching (`OffscreenCanvas`), preview rendering, and image encoding (`PNG`, `JPEG`, `WebP`) execute strictly locally on the user's device. The extension contains no analytics, telemetry, tracking pixels, remote fonts, or external API calls.
- **Minimal Browser Permissions (Manifest V3):**
  - `activeTab` & `scripting`: Temporarily access and capture only the currently active browser tab when the user explicitly clicks capture or invokes a keyboard shortcut.
  - `offscreen`: Perform off-screen pixel stitching without blocking the browser UI.
  - `downloads`: Save exported screenshots directly to the user's local downloads folder with sanitized filenames.
  - `storage`: Store only the user's local export preferences (default format, compression quality, and interface language).
- **Ephemeral Local Cache:** Captured screenshots are stored temporarily in browser-local `IndexedDB` solely to display them in the Preview Tab and are deleted automatically when the Preview Tab is closed.

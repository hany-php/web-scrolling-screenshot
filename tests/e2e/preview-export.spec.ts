import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { chromium, expect, type Page, test } from '@playwright/test';

const EXTENSION_PATH = path.resolve(process.cwd(), '.output', 'chrome-mv3');
const FIXTURES_DIR = path.resolve(process.cwd(), 'tests', 'fixtures');

function createE2eExtensionCopy(): { dir: string; cleanup: () => void } {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wss-e2e-preview-'));
  fs.cpSync(EXTENSION_PATH, tempDir, { recursive: true });

  const manifestPath = path.join(tempDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Record<string, unknown>;
  // Grant <all_urls> only inside temporary test copy so E2E can capture without real toolbar click.
  manifest['host_permissions'] = ['<all_urls>'];
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));

  return {
    dir: tempDir,
    cleanup: () => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    },
  };
}

async function startFixtureServer(): Promise<{ url: string; close: () => Promise<void> }> {
  const server = http.createServer((req, res) => {
    const reqPath = (req.url ?? '/').split('?')[0] ?? '/';
    const safeName = path.basename(reqPath === '/' ? 'region-scroll.html' : reqPath);
    const fullPath = path.join(FIXTURES_DIR, safeName);
    if (!fs.existsSync(fullPath)) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(fullPath).pipe(res);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve();
    });
  });

  const addr = server.address();
  if (!addr || typeof addr === 'string') {
    throw new Error('Failed to bind fixture server');
  }

  return {
    url: `http://127.0.0.1:${String(addr.port)}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }),
  };
}

function isPngSignature(buffer: Buffer): boolean {
  return buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
}

function isWebpSignature(buffer: Buffer): boolean {
  return (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  );
}

test.describe('Phase 3 Preview Tab, Multi-Format Export & i18n E2E', () => {
  test('captures, opens preview, switches zoom 100%, downloads PNG & WebP, persists prefs, and cleans IndexedDB on close', async () => {
    test.setTimeout(60_000);
    const server = await startFixtureServer();
    const extCopy = createE2eExtensionCopy();
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: true,
      viewport: { width: 1280, height: 720 },
      args: [`--disable-extensions-except=${extCopy.dir}`, `--load-extension=${extCopy.dir}`],
    });

    try {
      let [serviceWorker] = context.serviceWorkers();
      if (!serviceWorker) {
        serviceWorker = await context.waitForEvent('serviceworker', { timeout: 10_000 });
      }
      const extensionId = new URL(serviceWorker.url()).host;

      const fixturePage = await context.newPage();
      await fixturePage.goto(`${server.url}/region-scroll.html`);

      const targetTabId = await serviceWorker.evaluate(async () => {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tabId = tabs[0]?.id;
        if (tabId === undefined) {
          throw new Error('Target tab not found');
        }
        return tabId;
      });

      const popupPage = await context.newPage();
      await popupPage.goto(
        `chrome-extension://${extensionId}/popup.html?targetTabId=${String(targetTabId)}`,
      );
      await popupPage.getByTestId('btn-capture-full').click();

      await expect(popupPage.getByTestId('popup-status')).toHaveText(
        'Preview opened — ready to download!',
        { timeout: 25_000 },
      );

      let previewPage: Page | undefined;
      await expect
        .poll(() => {
          previewPage = context.pages().find((p) => p.url().includes('/preview.html?jobId='));
          return Boolean(previewPage);
        })
        .toBe(true);
      if (!previewPage) {
        throw new Error('Preview tab did not open');
      }

      const previewUrl = previewPage.url();
      await previewPage.bringToFront();

      await expect(previewPage.getByTestId('preview-dimensions')).toHaveText(
        '1280 × 3500 px · 1x DPR',
      );
      await expect(previewPage.getByTestId('preview-filesize')).toContainText(/B|KB|MB/);

      // Switch to 100% zoom (1:1 native pixel width) and verify rendered image width
      await previewPage.getByTestId('btn-zoom-100').click();
      await expect(previewPage.getByTestId('zoom-readout')).toHaveText('100%');
      const renderedWidth100 = await previewPage
        .getByTestId('preview-image-part-0')
        .evaluate((el) => Number.parseFloat(getComputedStyle(el).width));
      expect(renderedWidth100).toBe(1280);

      // Keyboard zoom '-' and '0' (Fit)
      await previewPage.keyboard.press('-');
      await expect(previewPage.getByTestId('zoom-readout')).toHaveText('75%');
      await previewPage.keyboard.press('0');

      // Download PNG
      await previewPage.getByTestId('btn-download').click();
      await expect(previewPage.getByTestId('preview-download-status')).toHaveText('Downloaded!', {
        timeout: 15_000,
      });

      const pngDownload = await serviceWorker.evaluate(async () => {
        const items = await chrome.downloads.search({ orderBy: ['-startTime'], limit: 1 });
        return { filename: items[0]?.filename ?? '', mime: items[0]?.mime ?? '' };
      });
      expect(pngDownload.mime).toBe('image/png');
      expect(isPngSignature(fs.readFileSync(pngDownload.filename))).toBe(true);

      // Switch to WebP + quality slider & download WebP
      await previewPage.getByTestId('format-webp').click();
      await expect(previewPage.getByTestId('quality-slider')).toBeVisible();
      await previewPage.getByTestId('btn-download').click();
      await expect(previewPage.getByTestId('preview-download-status')).toHaveText('Downloaded!', {
        timeout: 15_000,
      });

      const webpDownload = await serviceWorker.evaluate(async () => {
        const items = await chrome.downloads.search({ orderBy: ['-startTime'], limit: 1 });
        return { filename: items[0]?.filename ?? '', mime: items[0]?.mime ?? '' };
      });
      expect(webpDownload.mime).toBe('image/webp');
      expect(isWebpSignature(fs.readFileSync(webpDownload.filename))).toBe(true);

      // Verify preference persistence in Popup
      await popupPage.reload();
      await expect(popupPage.getByTestId('popup-format-webp')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expect(popupPage.getByTestId('popup-quality-slider')).toBeVisible();

      // Close preview tab and verify IndexedDB cache record is cleaned up
      await previewPage.close();
      const reopened = await context.newPage();
      await expect
        .poll(
          async () => {
            await reopened.goto(previewUrl);
            return await reopened.getByTestId('preview-empty').textContent();
          },
          { timeout: 10_000 },
        )
        .toContain('expired or was closed');
    } finally {
      await context.close();
      extCopy.cleanup();
      await server.close();
    }
  });

  test('renders Arabic RTL preview and popup with non-overlapping toolbar and keyboard navigation', async () => {
    test.setTimeout(60_000);
    const server = await startFixtureServer();
    const extCopy = createE2eExtensionCopy();
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: true,
      locale: 'ar-EG',
      viewport: { width: 1280, height: 720 },
      args: [
        `--disable-extensions-except=${extCopy.dir}`,
        `--load-extension=${extCopy.dir}`,
        '--lang=ar',
      ],
    });

    try {
      let [serviceWorker] = context.serviceWorkers();
      if (!serviceWorker) {
        serviceWorker = await context.waitForEvent('serviceworker', { timeout: 10_000 });
      }
      const extensionId = new URL(serviceWorker.url()).host;

      const fixturePage = await context.newPage();
      await fixturePage.goto(`${server.url}/region-scroll.html`);

      const targetTabId = await serviceWorker.evaluate(async () => {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tabId = tabs[0]?.id;
        if (tabId === undefined) {
          throw new Error('Target tab not found');
        }
        return tabId;
      });

      const popupPage = await context.newPage();
      await popupPage.setViewportSize({ width: 360, height: 540 });
      await popupPage.goto(
        `chrome-extension://${extensionId}/popup.html?targetTabId=${String(targetTabId)}`,
      );

      await expect(popupPage.locator('html')).toHaveAttribute('dir', 'rtl');
      const popupOverflow = await popupPage.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(popupOverflow).toBe(false);

      await popupPage.getByTestId('btn-capture-full').click();

      let previewPage: Page | undefined;
      await expect
        .poll(() => {
          previewPage = context.pages().find((p) => p.url().includes('/preview.html?jobId='));
          return Boolean(previewPage);
        })
        .toBe(true);
      if (!previewPage) {
        throw new Error('Preview tab did not open');
      }

      await previewPage.bringToFront();
      await expect(previewPage.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(previewPage.getByTestId('btn-download')).toHaveText('تنزيل');
      await expect(previewPage.getByTestId('btn-zoom-fit')).toContainText('ملائمة');

      // Check toolbar controls do not overlap each other
      const overlap = await previewPage.evaluate(() => {
        const selectors = [
          'btn-zoom-fit',
          'btn-zoom-100',
          'btn-zoom-out',
          'btn-zoom-in',
          'format-png',
          'format-jpeg',
          'format-webp',
          'btn-download',
        ];
        const boxes = selectors
          .map((id) => document.querySelector(`[data-testid="${id}"]`)?.getBoundingClientRect())
          .filter((b): b is DOMRect => Boolean(b));

        for (let i = 0; i < boxes.length; i += 1) {
          for (let j = i + 1; j < boxes.length; j += 1) {
            const a = boxes[i];
            const b = boxes[j];
            if (!a || !b) {
              continue;
            }
            const xOverlap = a.left < b.right && b.left < a.right;
            const yOverlap = a.top < b.bottom && b.top < a.bottom;
            if (xOverlap && yOverlap) {
              return true;
            }
          }
        }
        return false;
      });
      expect(overlap).toBe(false);

      // Verify keyboard Tab reaches download button & triggers download
      await previewPage.getByTestId('format-webp').focus();
      await previewPage.keyboard.press('Tab');
      await expect(previewPage.getByTestId('btn-download')).toBeFocused();
    } finally {
      await context.close();
      extCopy.cleanup();
      await server.close();
    }
  });
});

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { chromium, expect, type Page, test } from '@playwright/test';

const EXTENSION_PATH = path.resolve(process.cwd(), '.output', 'chrome-mv3');
const FIXTURES_DIR = path.resolve(process.cwd(), 'tests', 'fixtures');

function createE2eExtensionCopy(): { dir: string; cleanup: () => void } {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wss-e2e-hardening-'));
  fs.cpSync(EXTENSION_PATH, tempDir, { recursive: true });

  const manifestPath = path.join(tempDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Record<string, unknown>;
  manifest['host_permissions'] = ['<all_urls>'];
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));

  return {
    dir: tempDir,
    cleanup: () => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    },
  };
}

function readPngDimensions(buffer: Buffer): { width: number; height: number } {
  const pngSignature = '89504e470d0a1a0a';
  if (buffer.subarray(0, 8).toString('hex') !== pngSignature) {
    throw new Error('Output file is not a valid PNG');
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

async function samplePngRgb(
  page: Page,
  pngBase64: string,
  x: number,
  y: number,
): Promise<readonly [number, number, number]> {
  return await page.evaluate(
    async ({ b64, px, py }) => {
      const res = await fetch(`data:image/png;base64,${b64}`);
      const blob = await res.blob();
      const bitmap = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('No 2D context');
      }
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      const data = ctx.getImageData(px, py, 1, 1).data;
      return [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0] as const;
    },
    { b64: pngBase64, px: x, py: y },
  );
}

async function startFixtureServer(): Promise<{ url: string; close: () => Promise<void> }> {
  const server = http.createServer((req, res) => {
    const reqPath = (req.url ?? '/').split('?')[0] ?? '/';
    const safeName = path.basename(reqPath === '/' ? 'spa-inner-scroll.html' : reqPath);
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

test.describe('Phase 4 Hardening, Browser Zoom, Inner Scroller & Security E2E', () => {
  test('captures 1.5x DPI (150% scale) sticky page with exact 1.5x physical pixels and zero external requests', async () => {
    test.setTimeout(60_000);
    const server = await startFixtureServer();
    const extCopy = createE2eExtensionCopy();
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: true,
      viewport: { width: 1000, height: 700 },
      deviceScaleFactor: 1.5,
      args: [
        `--disable-extensions-except=${extCopy.dir}`,
        `--load-extension=${extCopy.dir}`,
        '--force-device-scale-factor=1.5',
      ],
    });

    try {
      let [serviceWorker] = context.serviceWorkers();
      if (!serviceWorker) {
        serviceWorker = await context.waitForEvent('serviceworker', { timeout: 10_000 });
      }
      const extensionId = new URL(serviceWorker.url()).host;

      const externalRequests: string[] = [];
      context.on('request', (req) => {
        const u = req.url();
        if (
          !u.startsWith(server.url) &&
          !u.startsWith(`chrome-extension://${extensionId}`) &&
          !u.startsWith('data:') &&
          !u.startsWith('blob:')
        ) {
          externalRequests.push(u);
        }
      });

      const fixturePage = await context.newPage();
      await fixturePage.goto(`${server.url}/sticky-tall.html`);

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
        { timeout: 30_000 },
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

      await expect(previewPage.getByTestId('preview-dimensions')).toContainText(
        '9000 px · 1.5x DPR',
      );
      await previewPage.getByTestId('btn-download').click();
      await expect(previewPage.getByTestId('preview-download-status')).toHaveText('Downloaded!', {
        timeout: 15_000,
      });

      const downloaded = await serviceWorker.evaluate(async () => {
        const items = await chrome.downloads.search({ orderBy: ['-startTime'], limit: 1 });
        return items[0]?.filename ?? '';
      });
      const dims = readPngDimensions(fs.readFileSync(downloaded));
      expect(dims.height).toBe(9000);
      expect(externalRequests).toEqual([]);
    } finally {
      await context.close();
      extCopy.cleanup();
      await server.close();
    }
  });

  test('captures fixed-shell SPA inner scrollable container cleanly and switches live AR/EN UI', async () => {
    test.setTimeout(60_000);
    const server = await startFixtureServer();
    const extCopy = createE2eExtensionCopy();
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: true,
      viewport: { width: 1200, height: 720 },
      args: [`--disable-extensions-except=${extCopy.dir}`, `--load-extension=${extCopy.dir}`],
    });

    try {
      let [serviceWorker] = context.serviceWorkers();
      if (!serviceWorker) {
        serviceWorker = await context.waitForEvent('serviceworker', { timeout: 10_000 });
      }
      const extensionId = new URL(serviceWorker.url()).host;

      const fixturePage = await context.newPage();
      await fixturePage.goto(`${server.url}/spa-inner-scroll.html`);

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

      // Toggle English -> Arabic live inside Popup and verify persistence
      await expect(popupPage.locator('html')).toHaveAttribute('dir', 'ltr');
      await popupPage.getByTestId('btn-toggle-locale').click();
      await expect(popupPage.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(popupPage.getByTestId('popup-title')).toHaveText('تصوير صفحات الويب');

      await popupPage.getByTestId('btn-capture-full').click();
      await expect(popupPage.getByTestId('popup-status')).toHaveText(
        'تم فتح المعاينة — جاهز للتنزيل!',
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

      // Preview inherits saved Arabic RTL automatically
      await expect(previewPage.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(previewPage.getByTestId('btn-download')).toHaveText('تنزيل');

      await previewPage.getByTestId('btn-download').click();
      await expect(previewPage.getByTestId('preview-download-status')).toHaveText('تم التنزيل!', {
        timeout: 15_000,
      });

      const downloaded = await serviceWorker.evaluate(async () => {
        const items = await chrome.downloads.search({ orderBy: ['-startTime'], limit: 1 });
        return items[0]?.filename ?? '';
      });

      const pngBytes = fs.readFileSync(downloaded);
      const dims = readPngDimensions(pngBytes);
      expect(dims.height).toBe(3200);

      const b64 = pngBytes.toString('base64');
      expect(await samplePngRgb(previewPage, b64, 50, 100)).toEqual([16, 185, 129]);
      expect(await samplePngRgb(previewPage, b64, 50, 1500)).toEqual([139, 92, 246]);
      expect(await samplePngRgb(previewPage, b64, 50, 2600)).toEqual([249, 115, 22]);

      // Toggle back to English inside Preview
      await previewPage.getByTestId('btn-toggle-locale').click();
      await expect(previewPage.locator('html')).toHaveAttribute('dir', 'ltr');
      await expect(previewPage.getByTestId('btn-download')).toHaveText('Download');
    } finally {
      await context.close();
      extCopy.cleanup();
      await server.close();
    }
  });
});

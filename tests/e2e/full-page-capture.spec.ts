import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { chromium, expect, test } from '@playwright/test';

const EXTENSION_PATH = path.resolve(process.cwd(), '.output', 'chrome-mv3');
const FIXTURES_DIR = path.resolve(process.cwd(), 'tests', 'fixtures');

function createE2eExtensionCopy(): { dir: string; cleanup: () => void } {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wss-e2e-ext-'));
  fs.cpSync(EXTENSION_PATH, tempDir, { recursive: true });

  const manifestPath = path.join(tempDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Record<string, unknown>;
  // Grant <all_urls> only in the temporary E2E harness copy because Playwright cannot click the browser toolbar icon to trigger activeTab for captureVisibleTab.
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

async function startFixtureServer(): Promise<{ url: string; close: () => Promise<void> }> {
  const server = http.createServer((req, res) => {
    const reqPath = (req.url ?? '/').split('?')[0] ?? '/';
    const safeName = path.basename(reqPath === '/' ? 'sticky-tall.html' : reqPath);
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

async function samplePngRgb(
  page: import('@playwright/test').Page,
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

test.describe('Phase 1 Full-Page High-DPI Capture E2E', () => {
  test('captures 6000px sticky-header page accurately with zero sticky duplication', async () => {
    const server = await startFixtureServer();
    const extCopy = createE2eExtensionCopy();
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: true,
      viewport: { width: 1280, height: 800 },
      args: [`--disable-extensions-except=${extCopy.dir}`, `--load-extension=${extCopy.dir}`],
    });

    try {
      let [serviceWorker] = context.serviceWorkers();
      if (!serviceWorker) {
        serviceWorker = await context.waitForEvent('serviceworker', { timeout: 10_000 });
      }
      const extensionId = new URL(serviceWorker.url()).host;

      const fixturePage = await context.newPage();
      await fixturePage.goto(`${server.url}/sticky-tall.html`);
      await fixturePage.evaluate(() => {
        window.scrollTo(0, 450);
      });

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

      const startedAt = Date.now();
      await popupPage.getByTestId('btn-capture-full').click();

      await expect(popupPage.getByTestId('popup-status')).toHaveText(
        'Preview opened — ready to download!',
        {
          timeout: 25_000,
        },
      );
      const elapsedMs = Date.now() - startedAt;
      expect(elapsedMs).toBeLessThan(20_000);

      let previewPage: import('@playwright/test').Page | undefined;
      await expect
        .poll(() => {
          previewPage = context.pages().find((p) => p.url().includes('/preview.html?jobId='));
          return Boolean(previewPage);
        })
        .toBe(true);
      if (!previewPage) {
        throw new Error('Preview tab did not open');
      }
      await previewPage.getByTestId('btn-download').click();
      await expect(previewPage.getByTestId('preview-download-status')).toHaveText('Downloaded!', {
        timeout: 15_000,
      });

      // Verify host page scroll position & fixed header visibility were restored
      const restored = await fixturePage.evaluate(() => {
        const header = document.getElementById('fixed-header');
        return {
          scrollY: window.scrollY,
          headerVisibility: header ? getComputedStyle(header).visibility : '',
        };
      });
      expect(restored.scrollY).toBe(450);
      expect(restored.headerVisibility).toBe('visible');

      const downloaded = await serviceWorker.evaluate(async () => {
        const items = await chrome.downloads.search({
          orderBy: ['-startTime'],
          limit: 1,
        });
        return {
          filename: items[0]?.filename ?? '',
          mime: items[0]?.mime ?? '',
        };
      });

      expect(downloaded.mime).toBe('image/png');
      const pngBytes = fs.readFileSync(downloaded.filename);
      const dims = readPngDimensions(pngBytes);
      expect(dims.height).toBe(6000);
      expect(dims.width).toBeGreaterThanOrEqual(1200);

      // Sample top header (y=20 -> red) and scrolled band 1 top (y=1010 -> blue, NOT red)
      const b64 = pngBytes.toString('base64');
      const headerRgb = await samplePngRgb(popupPage, b64, 50, 20);
      const band1Rgb = await samplePngRgb(popupPage, b64, 50, 1010);
      const band5Rgb = await samplePngRgb(popupPage, b64, 50, 5500);

      expect(headerRgb).toEqual([220, 38, 38]);
      expect(band1Rgb).toEqual([219, 234, 254]);
      expect(band5Rgb).toEqual([255, 237, 213]);
    } finally {
      await context.close();
      extCopy.cleanup();
      await server.close();
    }
  });

  test('splits ultra-tall 18000px page seamlessly into 2 PNG chunks at 16384px', async () => {
    test.setTimeout(60_000);
    const server = await startFixtureServer();
    const extCopy = createE2eExtensionCopy();
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: true,
      viewport: { width: 1000, height: 900 },
      args: [`--disable-extensions-except=${extCopy.dir}`, `--load-extension=${extCopy.dir}`],
    });

    try {
      let [serviceWorker] = context.serviceWorkers();
      if (!serviceWorker) {
        serviceWorker = await context.waitForEvent('serviceworker', { timeout: 10_000 });
      }
      const extensionId = new URL(serviceWorker.url()).host;

      const fixturePage = await context.newPage();
      await fixturePage.goto(`${server.url}/ultra-tall.html`);

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
        {
          timeout: 45_000,
        },
      );

      let previewPage: import('@playwright/test').Page | undefined;
      await expect
        .poll(() => {
          previewPage = context.pages().find((p) => p.url().includes('/preview.html?jobId='));
          return Boolean(previewPage);
        })
        .toBe(true);
      if (!previewPage) {
        throw new Error('Preview tab did not open');
      }
      await expect(previewPage.getByTestId('preview-parts-badge')).toHaveText('2 parts');
      await previewPage.getByTestId('btn-download').click();
      await expect(previewPage.getByTestId('preview-download-status')).toHaveText('Downloaded!', {
        timeout: 20_000,
      });

      const downloadedFiles = await serviceWorker.evaluate(async () => {
        const items = await chrome.downloads.search({
          orderBy: ['-startTime'],
          limit: 2,
        });
        return items.map((item) => item.filename).reverse();
      });

      expect(downloadedFiles).toHaveLength(2);
      const part1 = fs.readFileSync(downloadedFiles[0] ?? '');
      const part2 = fs.readFileSync(downloadedFiles[1] ?? '');

      const dims1 = readPngDimensions(part1);
      const dims2 = readPngDimensions(part2);

      expect(dims1.height).toBe(16_384);
      expect(dims2.height).toBe(18_000 - 16_384);
      expect(dims1.width).toBe(dims2.width);
    } finally {
      await context.close();
      extCopy.cleanup();
      await server.close();
    }
  });
});

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { chromium, expect, type Page, test } from '@playwright/test';

const EXTENSION_PATH = path.resolve(process.cwd(), '.output', 'chrome-mv3');
const FIXTURES_DIR = path.resolve(process.cwd(), 'tests', 'fixtures');

function createE2eExtensionCopy(): { dir: string; cleanup: () => void } {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wss-e2e-region-'));
  fs.cpSync(EXTENSION_PATH, tempDir, { recursive: true });

  const manifestPath = path.join(tempDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Record<string, unknown>;
  // Grant <all_urls> only in the temporary E2E harness copy because Playwright cannot click the toolbar icon to grant activeTab.
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

test.describe('Phase 2 Drag-to-Select Region Capture E2E', () => {
  test('captures in-viewport dragged region at exact dimensions with zero overlay tint', async () => {
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
      await popupPage.getByTestId('btn-capture-region').click();

      await fixturePage.bringToFront();
      await expect(fixturePage.locator('[data-wss-overlay="true"]')).toHaveCount(1);

      // Drag exactly over #in-view-box: (160, 180) -> (560, 480) = 400x300
      await fixturePage.mouse.move(160, 180);
      await fixturePage.mouse.down();
      await fixturePage.mouse.move(560, 480, { steps: 6 });
      await fixturePage.mouse.up();

      await expect(fixturePage.locator('[data-wss-overlay="true"]')).toHaveCount(0);
      await expect(popupPage.getByTestId('popup-status')).toHaveText(
        'Preview opened — ready to download!',
        {
          timeout: 15_000,
        },
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
      await previewPage.getByTestId('btn-download').click();
      await expect(previewPage.getByTestId('preview-download-status')).toHaveText('Downloaded!', {
        timeout: 15_000,
      });

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
      expect(readPngDimensions(pngBytes)).toEqual({ width: 400, height: 300 });

      const centerRgb = await samplePngRgb(popupPage, pngBytes.toString('base64'), 200, 150);
      expect(centerRgb).toEqual([34, 197, 94]);
    } finally {
      await context.close();
      extCopy.cleanup();
      await server.close();
    }
  });

  test('auto-scrolls during tall region drag (>= 1800px) and stitches exact bands cleanly', async () => {
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
      await popupPage.getByTestId('btn-capture-region').click();

      await fixturePage.bringToFront();
      await expect(fixturePage.locator('[data-wss-overlay="true"]')).toHaveCount(1);

      // Start drag at top-left of #tall-region-box (640, 300) and drag down into bottom 48px auto-scroll zone
      await fixturePage.mouse.move(640, 300);
      await fixturePage.mouse.down();
      await fixturePage.mouse.move(1060, 710, { steps: 8 });

      // Wait until auto-scroll brings total height to at least 1800px (300 + 1800 - 710 = scrollY 1390)
      await expect
        .poll(() => fixturePage.evaluate(() => window.scrollY), { timeout: 12_000 })
        .toBeGreaterThanOrEqual(1390);

      await fixturePage.mouse.up();
      await expect(fixturePage.locator('[data-wss-overlay="true"]')).toHaveCount(0);

      await expect(popupPage.getByTestId('popup-status')).toHaveText(
        'Preview opened — ready to download!',
        {
          timeout: 25_000,
        },
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
      await previewPage.getByTestId('btn-download').click();
      await expect(previewPage.getByTestId('preview-download-status')).toHaveText('Downloaded!', {
        timeout: 15_000,
      });

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
      expect(dims.width).toBe(420);
      expect(dims.height).toBeGreaterThanOrEqual(1800);

      const b64 = pngBytes.toString('base64');
      expect(await samplePngRgb(popupPage, b64, 200, 100)).toEqual([59, 130, 246]);
      expect(await samplePngRgb(popupPage, b64, 200, 800)).toEqual([245, 158, 11]);
      expect(await samplePngRgb(popupPage, b64, 200, 1650)).toEqual([239, 68, 68]);
    } finally {
      await context.close();
      extCopy.cleanup();
      await server.close();
    }
  });

  test('cancels cleanly on Esc and removes closed Shadow DOM host without downloading', async () => {
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
      await popupPage.getByTestId('btn-capture-region').click();

      await fixturePage.bringToFront();
      await expect(fixturePage.locator('[data-wss-overlay="true"]')).toHaveCount(1);

      await fixturePage.mouse.move(100, 100);
      await fixturePage.mouse.down();
      await fixturePage.mouse.move(320, 280, { steps: 4 });
      await fixturePage.keyboard.press('Escape');

      await expect(fixturePage.locator('[data-wss-overlay="true"]')).toHaveCount(0);
      await expect(popupPage.getByTestId('popup-status')).toHaveText('Capture cancelled', {
        timeout: 10_000,
      });

      const downloadsCount = await serviceWorker.evaluate(async () => {
        const items = await chrome.downloads.search({});
        return items.length;
      });
      expect(downloadsCount).toBe(0);
    } finally {
      await context.close();
      extCopy.cleanup();
      await server.close();
    }
  });
});

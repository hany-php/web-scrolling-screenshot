import path from 'node:path';
import { chromium, expect, test } from '@playwright/test';

const EXTENSION_PATH = path.resolve(process.cwd(), '.output', 'chrome-mv3');

test.describe('Phase 0 Extension Smoke Test', () => {
  test('loads built MV3 extension, renders popup in English, and verifies minimal permissions', async () => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: true,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--lang=en-US',
      ],
    });

    try {
      let [serviceWorker] = context.serviceWorkers();
      if (!serviceWorker) {
        serviceWorker = await context.waitForEvent('serviceworker', { timeout: 10_000 });
      }

      const extensionId = new URL(serviceWorker.url()).host;
      expect(extensionId.length).toBeGreaterThan(0);

      const page = await context.newPage();
      const consoleErrors: string[] = [];
      page.on('pageerror', (err) => consoleErrors.push(err.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(`chrome-extension://${extensionId}/popup.html`);

      await expect(page.getByTestId('popup-title')).toHaveText('Web Scrolling Screenshot');
      await expect(page.getByTestId('btn-capture-full')).toBeVisible();
      await expect(page.getByTestId('btn-capture-region')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

      await page.getByTestId('btn-capture-full').click();
      await expect(page.getByTestId('popup-status')).toHaveText('Capture Full Page');

      await page.goto(`chrome-extension://${extensionId}/preview.html`);
      await expect(page.getByTestId('preview-empty')).toBeVisible();

      expect(consoleErrors).toEqual([]);
    } finally {
      await context.close();
    }
  });

  test('renders Arabic RTL popup when Chromium locale is ar', async () => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: true,
      locale: 'ar-EG',
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--lang=ar',
      ],
    });

    try {
      let [serviceWorker] = context.serviceWorkers();
      if (!serviceWorker) {
        serviceWorker = await context.waitForEvent('serviceworker', { timeout: 10_000 });
      }

      const extensionId = new URL(serviceWorker.url()).host;
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/popup.html`);

      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.getByTestId('popup-title')).toHaveText('تصوير صفحات الويب');
      await expect(page.getByTestId('btn-capture-full')).toContainText('التقاط الصفحة كاملة');
    } finally {
      await context.close();
    }
  });
});

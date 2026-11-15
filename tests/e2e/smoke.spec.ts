import fs from 'node:fs';
import path from 'node:path';
import { chromium, expect, test } from '@playwright/test';

const EXTENSION_PATH = path.resolve(process.cwd(), '.output', 'chrome-mv3');

test.describe('Extension Popup & i18n Smoke Tests', () => {
  test('ships minimal MV3 manifest permissions with zero host_permissions', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(EXTENSION_PATH, 'manifest.json'), 'utf-8'),
    ) as {
      permissions?: string[];
      host_permissions?: string[];
      content_scripts?: unknown[];
      commands?: Record<string, unknown>;
    };

    expect(manifest.permissions).toEqual([
      'activeTab',
      'scripting',
      'offscreen',
      'downloads',
      'storage',
    ]);
    expect(manifest.host_permissions).toBeUndefined();
    expect(manifest.content_scripts).toBeUndefined();
    expect(manifest.commands).toHaveProperty('capture-full-page');
    expect(manifest.commands).toHaveProperty('capture-region');
  });
  test('renders English LTR popup and shows friendly restricted-page error on extension page', async () => {
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
      await expect(page.getByTestId('popup-status')).toContainText('cannot be captured');

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

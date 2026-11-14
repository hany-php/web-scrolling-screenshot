import { LAZY_SETTLE_DELAY_MS } from '../shared/constants';

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isInViewport(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom >= 0 &&
    rect.right >= 0 &&
    rect.top <= window.innerHeight &&
    rect.left <= window.innerWidth
  );
}

async function waitForVisibleImages(timeoutMs: number): Promise<void> {
  const pending = Array.from(document.querySelectorAll<HTMLImageElement>('img')).filter(
    (img) => !img.complete && isInViewport(img),
  );

  if (pending.length === 0) {
    return;
  }

  const imagePromises = pending.map(
    (img) =>
      new Promise<void>((resolve) => {
        if (img.complete) {
          resolve();
          return;
        }
        const done = (): void => {
          img.removeEventListener('load', done);
          img.removeEventListener('error', done);
          resolve();
        };
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      }),
  );

  await Promise.race([Promise.all(imagePromises), waitMs(timeoutMs)]);
}

export async function settleViewportPaint(
  settleDelayMs: number = LAZY_SETTLE_DELAY_MS,
  imageTimeoutMs: number = 400,
): Promise<void> {
  await nextAnimationFrame();
  await nextAnimationFrame();
  if (settleDelayMs > 0) {
    await waitMs(settleDelayMs);
  }
  await waitForVisibleImages(imageTimeoutMs);
}

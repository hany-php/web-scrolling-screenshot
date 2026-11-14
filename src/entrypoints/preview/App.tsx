import type { ReactElement } from 'react';
import { t } from '../../i18n/messages';

export function App(): ReactElement {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b border-[var(--wss-border)] bg-[var(--wss-bg-surface)] px-4">
        <h1 className="text-sm font-semibold text-[var(--wss-text-primary)]">
          {t('preview_title', 'Screenshot Preview')}
        </h1>
      </header>
      <section className="flex flex-1 items-center justify-center p-8 text-center">
        <p
          className="max-w-md text-sm text-[var(--wss-text-secondary)]"
          data-testid="preview-empty"
        >
          {t(
            'preview_empty_state',
            'No active capture loaded yet. Trigger a capture from the extension popup.',
          )}
        </p>
      </section>
    </main>
  );
}

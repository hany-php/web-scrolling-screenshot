import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../shared/tokens.css';
import { applyDocumentDirection, t } from '../../i18n/messages';
import { App } from './App';

applyDocumentDirection();
document.title = t('preview_title', 'Screenshot Preview');

const rootElement = document.getElementById('root');
if (rootElement !== null) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

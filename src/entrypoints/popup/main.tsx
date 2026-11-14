import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../shared/tokens.css';
import { applyDocumentDirection } from '../../i18n/messages';
import { App } from './App';

applyDocumentDirection();

const rootElement = document.getElementById('root');
if (rootElement !== null) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

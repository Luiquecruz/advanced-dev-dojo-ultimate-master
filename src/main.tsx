import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './app/App';
import { legacyHashRedirect } from '@/shared/routing/route';
import './app/styles.css';

const legacyPath = legacyHashRedirect(location, import.meta.env.BASE_URL);
if (legacyPath) {
  history.replaceState(null, '', legacyPath);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL} useTransitions={false}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

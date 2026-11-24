import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { useGame } from './store/gameStore.ts';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Offline-first: cache the app shell after the first visit (production builds only).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      // Installed apps on phones resume without reloading: look for a new version whenever the app comes back
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => undefined); });
    }).catch(() => undefined);
  });
  // A new version took over: reload to run it, but never in the middle of a live match
  let hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; }
    if (useGame.getState().screen !== 'match') { location.reload(); return; }
    const unsub = useGame.subscribe(s => { if (s.screen !== 'match') { unsub(); location.reload(); } });
  });
}

import { useEffect, useRef } from 'react';
import { createShell } from './shell';

function requestNavigation(path) {
  window.dispatchEvent(new CustomEvent('mfe:navigate', { detail: { path } }));
}

export function registerMicroFrontends(shell) {
  shell.register('profile', { route: '/profile', load: () => import('./microfrontends/profile') });
  shell.register('checkout', { route: '/checkout', load: () => import('./microfrontends/checkout') });
  shell.register('broken', {
    route: '/broken',
    load: () => Promise.reject(new Error('Chunk failed to load')),
  });
}

export default function App() {
  const outletRef = useRef(null);

  useEffect(() => {
    const shell = createShell(outletRef.current);
    registerMicroFrontends(shell);
    shell.navigate('/profile');
    return () => shell.destroy();
  }, []);

  return (
    <div>
      <nav aria-label="Shell">
        <button type="button" onClick={() => requestNavigation('/profile')}>
          Profile
        </button>{' '}
        <button type="button" onClick={() => requestNavigation('/checkout')}>
          Checkout
        </button>{' '}
        <button type="button" onClick={() => requestNavigation('/broken')}>
          Broken
        </button>
      </nav>
      <div ref={outletRef} />
    </div>
  );
}

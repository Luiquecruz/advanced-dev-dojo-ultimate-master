import { useState, useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';

function subscribe(onChange) {
  const media = window.matchMedia(query);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

export function FadePanel({ open, children }) {
  const [mounted, setMounted] = useState(open);
  const reducedMotion = usePrefersReducedMotion();

  if (open && !mounted) {
    setMounted(true);
  }
  if (!open && mounted && reducedMotion) {
    setMounted(false);
  }

  if (!mounted) return null;

  return (
    <div
      data-state={open ? 'open' : 'closed'}
      className={open ? 'fade-in' : 'fade-out'}
      onAnimationEnd={() => {
        if (!open) setMounted(false);
      }}
    >
      {children}
    </div>
  );
}

export default function App() {
  const [open, setOpen] = useState(true);
  return (
    <main>
      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
        @keyframes fade-out { to { opacity: 0; transform: translateY(-6px); } }
        .fade-in { animation: fade-in 250ms ease-out; }
        .fade-out { animation: fade-out 250ms ease-in forwards; }
      `}</style>
      <button onClick={() => setOpen((value) => !value)}>{open ? 'Hide' : 'Show'} details</button>
      <FadePanel open={open}>React animates by toggling classes; CSS does the motion.</FadePanel>
    </main>
  );
}

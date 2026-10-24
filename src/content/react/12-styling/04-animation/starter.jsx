import { useState, useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';

export function usePrefersReducedMotion() {
  // TODO: subscribe to window.matchMedia(query) with useSyncExternalStore
  return false;
}

export function FadePanel({ open, children }) {
  // TODO: keep the panel mounted while it animates out
  // TODO: unmount immediately when the user prefers reduced motion
  if (!open) return null;

  return (
    <div data-state="open" className="fade-in">
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

import { useState } from 'react';
import { createPortal } from 'react-dom';

export function Modal({ open, title, onClose, children }) {
  // TODO: return null when closed
  // TODO: render the dialog into document.body with createPortal
  return (
    <div role="dialog" aria-modal="true" aria-label={title}>
      <h2>{title}</h2>
      {children}
      <button onClick={onClose}>Close</button>
    </div>
  );
}

export default function App() {
  const [open, setOpen] = useState(false);
  const [clicks, setClicks] = useState(0);

  return (
    <div data-testid="app" onClick={() => setClicks((count) => count + 1)}>
      {/* TODO: render the "Open modal" button, the clicks paragraph and the Modal */}
    </div>
  );
}

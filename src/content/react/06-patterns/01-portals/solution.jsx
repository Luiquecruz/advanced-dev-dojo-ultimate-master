import { useState } from 'react';
import { createPortal } from 'react-dom';

export function Modal({ open, title, onClose, children }) {
  if (!open) {
    return null;
  }
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title}>
      <h2>{title}</h2>
      {children}
      <button onClick={onClose}>Close</button>
    </div>,
    document.body,
  );
}

export default function App() {
  const [open, setOpen] = useState(false);
  const [clicks, setClicks] = useState(0);

  return (
    <div data-testid="app" onClick={() => setClicks((count) => count + 1)}>
      <button onClick={() => setOpen(true)}>Open modal</button>
      <p>Clicks inside app: {clicks}</p>
      <Modal open={open} title="Settings" onClose={() => setOpen(false)}>
        <p>Portal content</p>
      </Modal>
    </div>
  );
}

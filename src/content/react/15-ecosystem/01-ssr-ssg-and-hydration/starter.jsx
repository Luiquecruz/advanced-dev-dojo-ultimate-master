import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';

export default function App({ initialCount = 0 }) {
  const [count, setCount] = useState(initialCount);
  // TODO: random ids differ between server and client: generate a stable id instead
  const stepId = `step-${Math.random().toString(36).slice(2)}`;

  return (
    <main>
      <h1>Server rendered counter</h1>
      <label htmlFor={stepId}>Step</label>
      <input id={stepId} type="number" defaultValue={1} />
      <button onClick={() => setCount((value) => value + 1)}>Count: {count}</button>
    </main>
  );
}

export function renderApp(initialCount) {
  // TODO: render <App initialCount={initialCount} /> to an HTML string
  return '';
}

export function hydrateApp(container, initialCount) {
  // TODO: attach React to the existing server HTML instead of re-rendering from scratch
  const root = createRoot(container);
  root.render(<App initialCount={initialCount} />);
  return root;
}

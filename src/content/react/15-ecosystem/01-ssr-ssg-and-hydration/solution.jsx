import { useId, useState } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';

export default function App({ initialCount = 0 }) {
  const [count, setCount] = useState(initialCount);
  const stepId = useId();

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
  return renderToString(<App initialCount={initialCount} />);
}

export function hydrateApp(container, initialCount) {
  return hydrateRoot(container, <App initialCount={initialCount} />);
}

import { useState } from 'react';

export function useToggle(initialOn = false) {
  // TODO: keep `on` in state and return { on, toggle }
  return { on: initialOn, toggle: () => {} };
}

export function Toggle({ initialOn = false, children }) {
  // TODO: call children with the result of useToggle(initialOn)
  return null;
}

export function MouseTracker({ render }) {
  // TODO: store { x, y } from onMouseMove and render render({ x, y }) inside the div
  return <div data-testid="tracker" />;
}

export default function App() {
  return (
    <section>
      {/* TODO: use <Toggle> with a function child to render the button and the details paragraph */}
    </section>
  );
}

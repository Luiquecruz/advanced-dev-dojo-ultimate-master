import { useState } from 'react';

export function useToggle(initialOn = false) {
  const [on, setOn] = useState(initialOn);
  const toggle = () => setOn((current) => !current);
  return { on, toggle };
}

export function Toggle({ initialOn = false, children }) {
  return children(useToggle(initialOn));
}

export function MouseTracker({ render }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  return (
    <div data-testid="tracker" onMouseMove={(event) => setPosition({ x: event.clientX, y: event.clientY })}>
      {render(position)}
    </div>
  );
}

export default function App() {
  return (
    <section>
      <Toggle>
        {({ on, toggle }) => (
          <>
            <button onClick={toggle}>{on ? 'Hide details' : 'Show details'}</button>
            {on && <p>Render props share logic.</p>}
          </>
        )}
      </Toggle>
    </section>
  );
}

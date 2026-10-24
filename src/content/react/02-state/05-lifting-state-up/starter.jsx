import { useState } from 'react';

export function Panel({ title, children }) {
  // TODO: remove this state; receive isActive and onShow as props instead
  const [isActive, setIsActive] = useState(false);

  return (
    <section>
      <h3>{title}</h3>
      {isActive ? <p>{children}</p> : <button onClick={() => setIsActive(true)}>Show</button>}
    </section>
  );
}

export default function Accordion() {
  // TODO: add an activeIndex state starting at 0 and pass isActive/onShow to each Panel

  return (
    <>
      <h2>Almaty, Kazakhstan</h2>
      <Panel title="About">Almaty is the largest city in Kazakhstan.</Panel>
      <Panel title="Etymology">The name comes from the Kazakh word for apple.</Panel>
    </>
  );
}

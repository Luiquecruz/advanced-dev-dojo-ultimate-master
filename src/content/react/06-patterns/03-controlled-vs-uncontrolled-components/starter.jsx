import { useState } from 'react';

export function NewsletterForm({ defaultEmail = '', onSubscribe }) {
  function handleSubmit(event) {
    // TODO: prevent the default, read "email" with FormData, call onSubscribe and reset the form
  }

  return (
    <form aria-label="Newsletter" onSubmit={handleSubmit}>
      {/* TODO: make the input uncontrolled with defaultValue */}
      <input name="email" aria-label="Email" />
      <button>Subscribe</button>
    </form>
  );
}

export function Stepper({ value, defaultValue = 0, onChange }) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  // TODO: decide if the component is controlled and compute the current value
  const current = internalValue;

  const update = (next) => {
    // TODO: update the internal state only when uncontrolled, and always call onChange
    setInternalValue(next);
  };

  return (
    <div>
      <button onClick={() => update(current - 1)}>-</button>
      <output>{current}</output>
      <button onClick={() => update(current + 1)}>+</button>
    </div>
  );
}

export default function App() {
  // TODO: keep quantity in state and render a controlled Stepper, the quantity paragraph and a Reset button
  return <Stepper defaultValue={1} />;
}

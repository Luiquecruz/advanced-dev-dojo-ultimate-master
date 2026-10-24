import { useState } from 'react';

export function NewsletterForm({ defaultEmail = '', onSubscribe }) {
  function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = new FormData(form).get('email');
    onSubscribe(email);
    form.reset();
  }

  return (
    <form aria-label="Newsletter" onSubmit={handleSubmit}>
      <input name="email" aria-label="Email" defaultValue={defaultEmail} />
      <button>Subscribe</button>
    </form>
  );
}

export function Stepper({ value, defaultValue = 0, onChange }) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internalValue;

  const update = (next) => {
    if (!isControlled) {
      setInternalValue(next);
    }
    onChange?.(next);
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
  const [quantity, setQuantity] = useState(1);

  return (
    <section>
      <Stepper value={quantity} onChange={setQuantity} />
      <p>Quantity: {quantity}</p>
      <button onClick={() => setQuantity(0)}>Reset</button>
    </section>
  );
}

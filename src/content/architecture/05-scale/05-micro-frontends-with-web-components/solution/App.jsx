import { useState } from 'react';
import { defineCartSummary } from './cart-summary';

defineCartSummary();

export default function App() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('');

  return (
    <section>
      <h2>Host application</h2>
      <button type="button" onClick={() => setCount(count + 1)}>
        Add item
      </button>
      <cart-summary
        count={count}
        oncart:checkout={(event) => setMessage(`Checked out ${event.detail.count} items`)}
      />
      <p role="status">{message}</p>
    </section>
  );
}

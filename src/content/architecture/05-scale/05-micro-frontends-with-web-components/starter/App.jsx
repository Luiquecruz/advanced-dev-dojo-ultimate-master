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
      {/* TODO: listen to cart:checkout and set the message `Checked out ${event.detail.count} items` */}
      <cart-summary count={count} />
      <p role="status">{message}</p>
    </section>
  );
}

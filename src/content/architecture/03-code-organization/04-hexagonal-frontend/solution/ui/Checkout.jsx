import { useState } from 'react';
import { usePlaceOrder } from './PlaceOrderContext';

function formatMoney(amount) {
  return `$${amount.toFixed(2)}`;
}

export function Checkout({ items }) {
  const placeOrder = usePlaceOrder();
  const [result, setResult] = useState({ status: 'idle' });

  async function handlePlaceOrder() {
    setResult({ status: 'pending' });
    try {
      const order = await placeOrder(items);
      setResult({ status: 'placed', order });
    } catch (error) {
      setResult({ status: 'failed', message: error.message });
    }
  }

  return (
    <section aria-label="Checkout">
      <ul aria-label="Order items">
        {items.map((item) => (
          <li key={item.productId}>
            {item.quantity} × {item.name} ({formatMoney(item.price)})
          </li>
        ))}
      </ul>
      <button onClick={handlePlaceOrder} disabled={result.status === 'pending'}>
        Place order
      </button>
      {result.status === 'placed' && (
        <p role="status">
          Order #{result.order.id} placed: {formatMoney(result.order.total)}
        </p>
      )}
      {result.status === 'failed' && <p role="alert">{result.message}</p>}
    </section>
  );
}
